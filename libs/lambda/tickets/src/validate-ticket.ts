import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import jwt from 'jsonwebtoken';
import { TABLE_NAME, TicketStatus, keys, validateTicketSchema } from '@event-tickets/shared-types';
import { jsonResponse, errorResponse, badRequestResponse, getAuthContext, getCorsOrigin, parseBody } from '@event-tickets/shared-utils';

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
  const origin = getCorsOrigin(event);
  try {
    const auth = getAuthContext(event);
    if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'GREETER')) {
      return errorResponse(403, 'FORBIDDEN', 'Greeter or admin access required', origin);
    }

    const result = parseBody(event);
    if ('error' in result) return result.error;

    const parsed = validateTicketSchema.safeParse(result.data);
    if (!parsed.success) {
      return badRequestResponse('QR token is required', origin);
    }

    const secret = await getQrSecret();
    let payload: { sub: string; eid: string; uid: string };

    try {
      payload = jwt.verify(parsed.data.qrToken, secret) as typeof payload;
    } catch (err) {
      return jsonResponse(200, { valid: false, reason: 'EXPIRED' }, origin);
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
      return jsonResponse(200, { valid: false, reason: 'NOT_FOUND' }, origin);
    }

    if (ticket['status'] === TicketStatus.USED) {
      return jsonResponse(200, { valid: false, reason: 'ALREADY_CHECKED_IN', ticketId, userName: ticket['userName'] || ticket['userEmail'] }, origin);
    }

    if (ticket['status'] !== TicketStatus.VALID) {
      return jsonResponse(200, { valid: false, reason: 'INVALID', ticketId }, origin);
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
        return jsonResponse(200, { valid: false, reason: 'ALREADY_CHECKED_IN', ticketId }, origin);
      }
      throw err;
    }

    // Get event name for response
    const eventResult = await dynamoClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: keys.event.pk(eventId), SK: keys.event.sk() },
    }));

    return jsonResponse(200, {
      valid: true,
      ticketId,
      userName: ticket['userName'] || ticket['userEmail'],
      eventName: eventResult.Item?.['name'] || '',
    }, origin);
  } catch (error) {
    console.error('Error validating ticket:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to validate ticket', origin);
  }
};
