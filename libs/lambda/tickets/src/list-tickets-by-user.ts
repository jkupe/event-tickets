import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { TABLE_NAME, keys } from '@event-tickets/shared-types';
import { jsonResponse, errorResponse, getAuthContext, getCorsOrigin } from '@event-tickets/shared-utils';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const origin = getCorsOrigin(event);
  try {
    const auth = getAuthContext(event);
    if (!auth) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required', origin);
    }

    // Find user first to get userId
    const userResult = await client.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': keys.user.gsi1pk(auth.email),
      },
      Limit: 1,
    }));

    const user = userResult.Items?.[0];
    if (!user) {
      return jsonResponse(200, { data: [] }, origin);
    }

    const userId = user['id'] as string;

    const result = await client.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': keys.ticket.gsi1pk(userId),
        ':skPrefix': 'TICKET#',
      },
      ScanIndexForward: false,
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
      qrCodeData: item['qrCodeData'],
      checkedInAt: item['checkedInAt'],
      quantity: item['quantity'],
      amountPaid: item['amountPaid'],
      createdAt: item['createdAt'],
    }));

    return jsonResponse(200, { data: tickets }, origin);
  } catch (error) {
    console.error('Error listing user tickets:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to list tickets', origin);
  }
};
