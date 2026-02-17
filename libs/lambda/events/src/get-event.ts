import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { TABLE_NAME, keys } from '@event-tickets/shared-types';
import { successResponse, notFoundResponse, errorResponse } from '@event-tickets/shared-utils';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const eventId = event.pathParameters?.['eventId'];
    if (!eventId) {
      return errorResponse(400, 'BAD_REQUEST', 'Event ID is required');
    }

    const result = await client.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: keys.event.pk(eventId),
        SK: keys.event.sk(),
      },
    }));

    if (!result.Item) {
      return notFoundResponse('Event not found');
    }

    const item = result.Item;
    return successResponse({
      id: item['id'],
      name: item['name'],
      description: item['description'],
      date: item['date'],
      endDate: item['endDate'],
      location: item['location'],
      price: item['price'],
      capacity: item['capacity'],
      ticketsSold: item['ticketsSold'],
      compTicketsIssued: item['compTicketsIssued'],
      status: item['status'],
      imageUrl: item['imageUrl'],
      createdAt: item['createdAt'],
      updatedAt: item['updatedAt'],
      createdBy: item['createdBy'],
    });
  } catch (error) {
    console.error('Error getting event:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to get event');
  }
};
