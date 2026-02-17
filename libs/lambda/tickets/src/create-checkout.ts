import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import Stripe from 'stripe';
import { TABLE_NAME, EventStatus, TicketStatus, keys, createCheckoutSchema } from '@event-tickets/shared-types';
import { errorResponse, badRequestResponse, notFoundResponse, getAuthContext, generateTicketId } from '@event-tickets/shared-utils';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
const secretsClient = new SecretsManagerClient({});

let stripeInstance: Stripe | null = null;

async function getStripe(): Promise<Stripe> {
  if (!stripeInstance) {
    const secret = await secretsClient.send(new GetSecretValueCommand({
      SecretId: process.env['STRIPE_API_KEY_SECRET_ARN'],
    }));
    stripeInstance = new Stripe(secret.SecretString!, { apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion });
  }
  return stripeInstance;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const auth = getAuthContext(event);
    if (!auth) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const eventId = event.pathParameters?.['eventId'];
    if (!eventId) {
      return badRequestResponse('Event ID is required');
    }

    let body: unknown;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return badRequestResponse('Invalid JSON body');
    }

    const parsed = createCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.issues.map(i => i.message).join(', '));
    }
    const quantity = parsed.data.quantity;

    // Get event
    const eventResult = await dynamoClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: keys.event.pk(eventId), SK: keys.event.sk() },
    }));

    const eventItem = eventResult.Item;
    if (!eventItem) {
      return notFoundResponse('Event not found');
    }

    if (eventItem['status'] !== EventStatus.ACTIVE) {
      return badRequestResponse('Event is not available for purchase');
    }

    if (eventItem['capacity'] !== null) {
      const available = (eventItem['capacity'] as number) - (eventItem['ticketsSold'] as number) - (eventItem['compTicketsIssued'] as number);
      if (available < quantity) {
        return badRequestResponse(`Only ${available} tickets available`);
      }
    }

    const ticketId = generateTicketId();
    const now = new Date().toISOString();
    const priceInCents = eventItem['price'] as number;

    // Create Stripe Checkout Session
    const stripe = await getStripe();
    const origin = event.headers['origin'] || event.headers['Origin'] || '';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: eventItem['name'] as string,
            description: `Ticket for ${eventItem['name']} on ${eventItem['date']}`,
          },
          unit_amount: priceInCents,
        },
        quantity,
      }],
      metadata: {
        eventId,
        ticketId,
        userId: auth.userId,
      },
      success_url: `${origin}/events/${eventId}/confirmation?ticketId=${ticketId}`,
      cancel_url: `${origin}/events/${eventId}`,
      customer_email: auth.email,
    });

    // Create PENDING ticket
    await dynamoClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: keys.ticket.pk(eventId),
        SK: keys.ticket.sk(ticketId),
        GSI1PK: keys.ticket.gsi1pk(auth.userId),
        GSI1SK: keys.ticket.gsi1sk(eventItem['date'] as string),
        GSI2PK: keys.ticket.gsi2pk(ticketId),
        GSI2SK: keys.ticket.gsi2sk(ticketId),
        id: ticketId,
        eventId,
        userId: auth.userId,
        userEmail: auth.email,
        userName: '',
        purchaseDate: now,
        status: TicketStatus.PENDING,
        isComp: false,
        compIssuedBy: null,
        compReason: null,
        stripePaymentIntentId: null,
        stripeCheckoutSessionId: session.id,
        qrCodeData: null,
        checkedInAt: null,
        checkedInBy: null,
        quantity,
        amountPaid: priceInCents * quantity,
        createdAt: now,
        entityType: 'TICKET',
      },
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        checkoutUrl: session.url,
        sessionId: session.id,
        ticketId,
      }),
    };
  } catch (error) {
    console.error('Error creating checkout:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to create checkout session');
  }
};
