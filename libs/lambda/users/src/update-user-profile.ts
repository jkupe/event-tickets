import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { keys, TABLE_NAME, updateUserProfileSchema } from '@event-tickets/shared-types';
import { successResponse, errorResponse, badRequestResponse, getAuthContext } from '@event-tickets/shared-utils';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const auth = getAuthContext(event);
  if (\!auth) {
    return errorResponse(401, 'UNAUTHORIZED', 'Unauthorized');
  }

  let body: unknown;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequestResponse('Invalid JSON body');
  }

  const parsed = updateUserProfileSchema.safeParse(body);
  if (\!parsed.success) {
    return badRequestResponse(parsed.error.issues.map(i => i.message).join(', '));
  }

  // Find user
  const lookup = await client.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: {
      ':pk': keys.user.gsi1pk(auth.email),
    },
    Limit: 1,
  }));

  const user = lookup.Items?.[0];
  if (\!user) {
    return errorResponse(404, 'NOT_FOUND', 'User profile not found');
  }

  const updates: string[] = [];
  const expressionValues: Record<string, unknown> = {};
  const expressionNames: Record<string, string> = {};

  if (parsed.data.name \!== undefined) {
    updates.push('#n = :name');
    expressionNames['#n'] = 'name';
    expressionValues[':name'] = parsed.data.name;
  }
  if (parsed.data.phone \!== undefined) {
    updates.push('phone = :phone');
    expressionValues[':phone'] = parsed.data.phone;
  }

  if (updates.length === 0) {
    return successResponse(user);
  }

  const result = await client.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: user['PK'],
      SK: user['SK'],
    },
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeValues: expressionValues,
    ...(Object.keys(expressionNames).length > 0 ? { ExpressionAttributeNames: expressionNames } : {}),
    ReturnValues: 'ALL_NEW',
  }));

  const updated = result.Attributes!;
  return successResponse({
    id: updated['id'],
    email: updated['email'],
    name: updated['name'],
    phone: updated['phone'],
    role: updated['role'],
    cognitoSub: updated['cognitoSub'],
    stripeCustomerId: updated['stripeCustomerId'],
    createdAt: updated['createdAt'],
  });
};
