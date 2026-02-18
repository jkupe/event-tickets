import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { TABLE_NAME, keys, updateEventSchema } from '@event-tickets/shared-types';
import { successResponse, badRequestResponse, forbiddenResponse, notFoundResponse, errorResponse, getAuthContext, getCorsOrigin, parseBody } from '@event-tickets/shared-utils';

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

    const eventId = event.pathParameters?.['eventId'];
    if (!eventId) {
      return badRequestResponse('Event ID is required', origin);
    }

    const result = parseBody(event);
    if ('error' in result) return result.error;

    const parsed = updateEventSchema.safeParse(result.data);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.issues.map(i => i.message).join(', '), origin);
    }

    // Get existing event
    const existing = await client.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: keys.event.pk(eventId),
        SK: keys.event.sk(),
      },
    }));

    if (!existing.Item) {
      return notFoundResponse('Event not found', origin);
    }

    const now = new Date().toISOString();
    const updated: Record<string, unknown> = {
      ...existing.Item,
      ...parsed.data,
      updatedAt: now,
    };

    // Update GSI1SK if status or date changed
    const status = updated['status'] as string;
    const date = updated['date'] as string;
    updated['GSI1SK'] = keys.event.gsi1sk(status, date);

    await client.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: updated,
    }));

    return successResponse({
      id: updated['id'],
      name: updated['name'],
      description: updated['description'],
      date: updated['date'],
      endDate: updated['endDate'],
      location: updated['location'],
      price: updated['price'],
      capacity: updated['capacity'],
      ticketsSold: updated['ticketsSold'],
      compTicketsIssued: updated['compTicketsIssued'],
      status: updated['status'],
      imageUrl: updated['imageUrl'],
      createdAt: updated['createdAt'],
      updatedAt: updated['updatedAt'],
      createdBy: updated['createdBy'],
    }, origin);
  } catch (error) {
    console.error('Error updating event:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to update event', origin);
  }
};
