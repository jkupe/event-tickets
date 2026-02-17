import type { PostConfirmationTriggerEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { keys, TABLE_NAME } from '@event-tickets/shared-types';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export const handler = async (event: PostConfirmationTriggerEvent): Promise<PostConfirmationTriggerEvent> => {
  const { sub, email, name } = event.request.userAttributes;
  const userId = `usr_${sub.replace(/-/g, '').substring(0, 16)}`;

  const now = new Date().toISOString();

  await client.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: keys.user.pk(userId),
      SK: keys.user.sk(),
      GSI1PK: keys.user.gsi1pk(email),
      GSI1SK: keys.user.gsi1sk(userId),
      id: userId,
      email,
      name: name || email.split('@')[0],
      phone: null,
      role: 'USER',
      cognitoSub: sub,
      stripeCustomerId: null,
      createdAt: now,
      entityType: 'USER',
    },
    ConditionExpression: 'attribute_not_exists(PK)',
  }));

  return event;
};
