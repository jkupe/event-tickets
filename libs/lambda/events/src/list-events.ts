import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { TABLE_NAME, EventStatus, keys } from '@event-tickets/shared-types';
import { successResponse, errorResponse } from '@event-tickets/shared-utils';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const status = event.queryStringParameters?.['status'] || EventStatus.ACTIVE;
    const limit = Math.min(parseInt(event.queryStringParameters?.['limit'] || '50', 10), 100);
    const nextToken = event.queryStringParameters?.['nextToken'];

    const result = await client.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': keys.event.gsi1pk(),
        ':skPrefix': `${status}#`,
      },
      Limit: limit,
      ...(nextToken ? { ExclusiveStartKey: JSON.parse(Buffer.from(nextToken, 'base64').toString()) } : {}),
    }));

    const items = (result.Items || []).map(item => ({
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
    }));

    const response: Record<string, unknown> = { data: items };
    if (result.LastEvaluatedKey) {
      response['nextToken'] = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error listing events:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to list events');
  }
};
