import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { TABLE_NAME, EventStatus, keys } from '@event-tickets/shared-types';
import { successResponse, forbiddenResponse, notFoundResponse, badRequestResponse, errorResponse, getAuthContext } from '@event-tickets/shared-utils';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const auth = getAuthContext(event);
    if (!auth || auth.role !== 'ADMIN') {
      return forbiddenResponse('Admin access required');
    }

    const eventId = event.pathParameters?.['eventId'];
    if (!eventId) {
      return badRequestResponse('Event ID is required');
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
      return notFoundResponse('Event not found');
    }

    // Soft delete: set status to CANCELLED
    const now = new Date().toISOString();
    await client.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: keys.event.pk(eventId),
        SK: keys.event.sk(),
      },
      UpdateExpression: 'SET #status = :status, updatedAt = :now, GSI1SK = :gsi1sk',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': EventStatus.CANCELLED,
        ':now': now,
        ':gsi1sk': keys.event.gsi1sk(EventStatus.CANCELLED, existing.Item['date'] as string),
      },
    }));

    return successResponse({ message: 'Event cancelled' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to delete event');
  }
};
