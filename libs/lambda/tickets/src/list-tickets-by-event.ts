import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { TABLE_NAME, keys } from '@event-tickets/shared-types';
import { jsonResponse, forbiddenResponse, badRequestResponse, errorResponse, getAuthContext, getCorsOrigin } from '@event-tickets/shared-utils';

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

    const result = await client.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': keys.ticket.pk(eventId),
        ':skPrefix': 'TICKET#',
      },
    }));

    const tickets = (result.Items || []).map(item => ({
      id: item['id'],
      eventId: item['eventId'],
      userId: item['userId'],
      userEmail: item['userEmail'],
      userName: item['userName'],
      purchaseDate: item['purchaseDate'],
      status: item['status'],
      isComp: item['isComp'],
      compIssuedBy: item['compIssuedBy'],
      compReason: item['compReason'],
      checkedInAt: item['checkedInAt'],
      checkedInBy: item['checkedInBy'],
      quantity: item['quantity'],
      amountPaid: item['amountPaid'],
      createdAt: item['createdAt'],
    }));

    return jsonResponse(200, { data: tickets }, origin);
  } catch (error) {
    console.error('Error listing tickets:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to list tickets', origin);
  }
};
