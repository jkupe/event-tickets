import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { keys, TABLE_NAME } from '@event-tickets/shared-types';
import { successResponse, errorResponse, getAuthContext, getCorsOrigin } from '@event-tickets/shared-utils';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const origin = getCorsOrigin(event);
  const auth = getAuthContext(event);
  if (!auth) {
    return errorResponse(401, 'UNAUTHORIZED', 'Unauthorized', origin);
  }

  // Look up user by email from auth context
  const result = await client.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: {
      ':pk': keys.user.gsi1pk(auth.email),
    },
    Limit: 1,
  }));

  const user = result.Items?.[0];
  if (!user) {
    return errorResponse(404, 'NOT_FOUND', 'User profile not found', origin);
  }

  return successResponse({
    id: user['id'],
    email: user['email'],
    name: user['name'],
    phone: user['phone'],
    role: user['role'],
    cognitoSub: user['cognitoSub'],
    stripeCustomerId: user['stripeCustomerId'],
    createdAt: user['createdAt'],
  }, origin);
};
