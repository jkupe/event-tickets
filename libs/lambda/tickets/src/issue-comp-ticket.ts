import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import jwt from 'jsonwebtoken';
import { TABLE_NAME, EventStatus, TicketStatus, keys, issueCompTicketSchema } from '@event-tickets/shared-types';
import { createdResponse, badRequestResponse, forbiddenResponse, notFoundResponse, errorResponse, getAuthContext, generateTicketId, getCorsOrigin, parseBody } from '@event-tickets/shared-utils';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
const secretsClient = new SecretsManagerClient({});
const lambdaClient = new LambdaClient({});

let qrSecret: string | null = null;

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
  const origin = getCorsOrigin(event);
  try {
    const auth = getAuthContext(event);
    if (!auth || auth.role !== 'ADMIN') {
      return forbiddenResponse('Admin access required', origin);
    }

    const eventId = event.pathParameters?.['eventId'];
    if (!eventId) {
      return badRequestResponse('Event ID is required', origin);
    }

    const result = parseBody(event);
    if ('error' in result) return result.error;

    const parsed = issueCompTicketSchema.safeParse(result.data);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.issues.map(i => i.message).join(', '), origin);
    }

    // Get event
    const eventResult = await dynamoClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: keys.event.pk(eventId), SK: keys.event.sk() },
    }));

    const eventItem = eventResult.Item;
    if (!eventItem) {
      return notFoundResponse('Event not found', origin);
    }

    if (eventItem['status'] === EventStatus.CANCELLED || eventItem['status'] === EventStatus.PAST) {
      return badRequestResponse('Cannot issue comp tickets for this event', origin);
    }

    const ticketId = generateTicketId();
    const now = new Date().toISOString();
    const jwtSecret = await getQrSecret();

    const qrToken = jwt.sign(
      { sub: ticketId, eid: eventId, uid: 'comp', iss: 'fbcpittsfield' },
      jwtSecret,
      { expiresIn: '365d' }
    );

    // Create ticket immediately as VALID
    await dynamoClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: keys.ticket.pk(eventId),
        SK: keys.ticket.sk(ticketId),
        GSI1PK: keys.ticket.gsi1pk('comp'),
        GSI1SK: keys.ticket.gsi1sk(eventItem['date'] as string),
        GSI2PK: keys.ticket.gsi2pk(ticketId),
        GSI2SK: keys.ticket.gsi2sk(ticketId),
        id: ticketId,
        eventId,
        userId: 'comp',
        userEmail: parsed.data.userEmail,
        userName: parsed.data.userName,
        purchaseDate: now,
        status: TicketStatus.VALID,
        isComp: true,
        compIssuedBy: auth.userId,
        compReason: parsed.data.reason,
        stripePaymentIntentId: null,
        stripeCheckoutSessionId: null,
        qrCodeData: qrToken,
        checkedInAt: null,
        checkedInBy: null,
        quantity: parsed.data.quantity,
        amountPaid: 0,
        createdAt: now,
        entityType: 'TICKET',
      },
    }));

    // Increment compTicketsIssued atomically
    await dynamoClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: keys.event.pk(eventId), SK: keys.event.sk() },
      UpdateExpression: 'ADD compTicketsIssued :qty',
      ExpressionAttributeValues: { ':qty': parsed.data.quantity },
    }));

    // Async invoke email Lambda
    if (process.env['EMAIL_LAMBDA_ARN']) {
      await lambdaClient.send(new InvokeCommand({
        FunctionName: process.env['EMAIL_LAMBDA_ARN'],
        InvocationType: 'Event',
        Payload: Buffer.from(JSON.stringify({
          type: 'COMP_TICKET',
          ticketId,
          eventId,
          qrToken,
          email: parsed.data.userEmail,
          userName: parsed.data.userName,
          eventName: eventItem['name'],
          eventDate: eventItem['date'],
          eventLocation: eventItem['location'],
        })),
      }));
    }

    return createdResponse({
      id: ticketId,
      eventId,
      userEmail: parsed.data.userEmail,
      userName: parsed.data.userName,
      status: TicketStatus.VALID,
      isComp: true,
      quantity: parsed.data.quantity,
    }, origin);
  } catch (error) {
    console.error('Error issuing comp ticket:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to issue comp ticket', origin);
  }
};
