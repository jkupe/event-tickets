import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';
import { TABLE_NAME, TicketStatus, keys } from '@event-tickets/shared-types';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
const secretsClient = new SecretsManagerClient({});
const lambdaClient = new LambdaClient({});

let stripeInstance: Stripe | null = null;
let webhookSecret: string | null = null;
let qrSecret: string | null = null;

async function getStripe(): Promise<Stripe> {
  if (!stripeInstance) {
    const secret = await secretsClient.send(new GetSecretValueCommand({
      SecretId: process.env['STRIPE_API_KEY_SECRET_ARN'],
    }));
    stripeInstance = new Stripe(secret.SecretString!, { apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion });
  }
  return stripeInstance;
}

async function getWebhookSecret(): Promise<string> {
  if (!webhookSecret) {
    const secret = await secretsClient.send(new GetSecretValueCommand({
      SecretId: process.env['STRIPE_WEBHOOK_SECRET_ARN'],
    }));
    webhookSecret = secret.SecretString!;
  }
  return webhookSecret;
}

async function getQrSecret(): Promise<string> {
  if (!qrSecret) {
    const secret = await secretsClient.send(new GetSecretValueCommand({
      SecretId: process.env['QR_JWT_SECRET_ARN'],
    }));
    qrSecret = secret.SecretString!;
  }
  return qrSecret;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const stripe = await getStripe();
    const secret = await getWebhookSecret();
    const sig = event.headers['Stripe-Signature'] || event.headers['stripe-signature'];

    if (!sig || !event.body) {
      return { statusCode: 400, body: 'Missing signature or body', headers: {} };
    }

    let stripeEvent: Stripe.Event;
    try {
      stripeEvent = stripe.webhooks.constructEvent(event.body, sig, secret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return { statusCode: 400, body: 'Invalid signature', headers: {} };
    }

    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        const { eventId, ticketId, userId } = session.metadata!;

        // Generate QR JWT
        const jwtSecret = await getQrSecret();
        const qrToken = jwt.sign(
          { sub: ticketId, eid: eventId, uid: userId, iss: 'fbcpittsfield' },
          jwtSecret,
          { expiresIn: '365d' }
        );

        // Update ticket: PENDING -> VALID
        try {
          await dynamoClient.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
              PK: keys.ticket.pk(eventId),
              SK: keys.ticket.sk(ticketId),
            },
            UpdateExpression: 'SET #status = :status, stripePaymentIntentId = :paymentIntent, qrCodeData = :qr',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':status': TicketStatus.VALID,
              ':paymentIntent': session.payment_intent as string,
              ':qr': qrToken,
              ':pending': TicketStatus.PENDING,
            },
            ConditionExpression: '#status = :pending',
          }));
        } catch (err: unknown) {
          if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
            console.log('Ticket already processed, skipping duplicate webhook');
            return { statusCode: 200, body: 'Already processed', headers: {} };
          }
          throw err;
        }

        // Increment ticketsSold atomically
        await dynamoClient.send(new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: keys.event.pk(eventId),
            SK: keys.event.sk(),
          },
          UpdateExpression: 'ADD ticketsSold :qty',
          ExpressionAttributeValues: { ':qty': 1 },
        }));

        // Async invoke email Lambda
        if (process.env['EMAIL_LAMBDA_ARN']) {
          await lambdaClient.send(new InvokeCommand({
            FunctionName: process.env['EMAIL_LAMBDA_ARN'],
            InvocationType: 'Event',
            Payload: Buffer.from(JSON.stringify({
              type: 'TICKET_CONFIRMATION',
              ticketId,
              eventId,
              userId,
              qrToken,
              email: session.customer_email,
            })),
          }));
        }

        break;
      }

      case 'checkout.session.expired': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        const { eventId, ticketId } = session.metadata!;

        await dynamoClient.send(new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: keys.ticket.pk(eventId),
            SK: keys.ticket.sk(ticketId),
          },
          UpdateExpression: 'SET #status = :status',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':status': TicketStatus.CANCELLED,
          },
        }));
        break;
      }

      case 'charge.refunded': {
        const charge = stripeEvent.data.object as Stripe.Charge;
        const paymentIntent = charge.payment_intent as string;

        // Find ticket by payment intent via scan (rare operation)
        // In production, you'd store a mapping or use a GSI
        console.log('Refund received for payment intent:', paymentIntent);
        break;
      }
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }), headers: { 'Content-Type': 'application/json' } };
  } catch (error) {
    console.error('Webhook error:', error);
    return { statusCode: 500, body: 'Internal error', headers: {} };
  }
};
