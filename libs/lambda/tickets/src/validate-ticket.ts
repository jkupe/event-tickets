import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import jwt from 'jsonwebtoken';
import { TABLE_NAME, TicketStatus, keys, validateTicketSchema } from '@event-tickets/shared-types';
import { errorResponse, badRequestResponse, getAuthContext } from '@event-tickets/shared-utils';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
const secretsClient = new SecretsManagerClient({});

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
  try {
    const auth = getAuthContext(event);
    if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'GREETER')) {
      return errorResponse(403, 'FORBIDDEN', 'Greeter or admin access required');
    }

    let body: unknown;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return badRequestResponse('Invalid JSON body');
    }

    const parsed = validateTicketSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse('QR token is required');
    }

    const secret = await getQrSecret();
    let payload: { sub: string; eid: string; uid: string };

    try {
      payload = jwt.verify(parsed.data.qrToken, secret) as typeof payload;
    } catch (err) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ valid: false, reason: 'EXPIRED' }),
      };
    }

    const ticketId = payload.sub;
    const eventId = payload.eid;

    // Look up ticket
    const ticketResult = await dynamoClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: { ':pk': keys.ticket.gsi2pk(ticketId) },
      Limit: 1,
    }));

    const ticket = ticketResult.Items?.[0];
    if (!ticket) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ valid: false, reason: 'NOT_FOUND' }),
      };
    }

    if (ticket['status'] === TicketStatus.USED) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ valid: false, reason: 'ALREADY_CHECKED_IN', ticketId, userName: ticket['userName'] || ticket['userEmail'] }),
      };
    }

    if (ticket['status'] !== TicketStatus.VALID) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ valid: false, reason: 'INVALID', ticketId }),
      };
    }

    // Conditional update: VALID -> USED
    const now = new Date().toISOString();
    try {
      await dynamoClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: keys.ticket.pk(eventId),
          SK: keys.ticket.sk(ticketId),
        },
        UpdateExpression: 'SET #status = :used, checkedInAt = :now, checkedInBy = :by',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':used': TicketStatus.USED,
          ':now': now,
          ':by': auth.userId,
          ':valid': TicketStatus.VALID,
        },
        ConditionExpression: '#status = :valid',
      }));
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ valid: false, reason: 'ALREADY_CHECKED_IN', ticketId }),
        };
      }
      throw err;
    }

    // Get event name for response
    const eventResult = await dynamoClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: keys.event.pk(eventId), SK: keys.event.sk() },
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        valid: true,
        ticketId,
        userName: ticket['userName'] || ticket['userEmail'],
        eventName: eventResult.Item?.['name'] || '',
      }),
    };
  } catch (error) {
    console.error('Error validating ticket:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to validate ticket');
  }
};
