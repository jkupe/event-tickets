import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { TABLE_NAME, EventStatus, keys, createEventSchema } from '@event-tickets/shared-types';
import { createdResponse, badRequestResponse, forbiddenResponse, errorResponse, getAuthContext, generateEventId, getCorsOrigin, parseBody } from '@event-tickets/shared-utils';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const origin = getCorsOrigin(event);
  try {
    const auth = getAuthContext(event);
    if (!auth || auth.role !== 'ADMIN') {
      return forbiddenResponse('Admin access required', origin);
    }

    const result = parseBody(event);
    if ('error' in result) return result.error;

    const parsed = createEventSchema.safeParse(result.data);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.issues.map(i => i.message).join(', '), origin);
    }

    const eventId = generateEventId();
    const now = new Date().toISOString();
    const status = EventStatus.DRAFT;

    const item = {
      PK: keys.event.pk(eventId),
      SK: keys.event.sk(),
      GSI1PK: keys.event.gsi1pk(),
      GSI1SK: keys.event.gsi1sk(status, parsed.data.date),
      id: eventId,
      ...parsed.data,
      ticketsSold: 0,
      compTicketsIssued: 0,
      status,
      imageUrl: parsed.data.imageUrl || null,
      createdAt: now,
      updatedAt: now,
      createdBy: auth.userId,
      entityType: 'EVENT',
    };

    await client.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }));

    return createdResponse({
      id: eventId,
      name: parsed.data.name,
      description: parsed.data.description,
      date: parsed.data.date,
      endDate: parsed.data.endDate,
      location: parsed.data.location,
      price: parsed.data.price,
      capacity: parsed.data.capacity,
      ticketsSold: 0,
      compTicketsIssued: 0,
      status,
      imageUrl: parsed.data.imageUrl || null,
      createdAt: now,
      updatedAt: now,
      createdBy: auth.userId,
    }, origin);
  } catch (error) {
    console.error('Error creating event:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to create event', origin);
  }
};
