import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { TABLE_NAME, keys } from '@event-tickets/shared-types';
import { successResponse, notFoundResponse, errorResponse, forbiddenResponse, getAuthContext } from '@event-tickets/shared-utils';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const auth = getAuthContext(event);
    if (!auth) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const ticketId = event.pathParameters?.['ticketId'];
    if (!ticketId) {
      return errorResponse(400, 'BAD_REQUEST', 'Ticket ID is required');
    }

    // Look up ticket via GSI2
    const result = await client.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: {
        ':pk': keys.ticket.gsi2pk(ticketId),
      },
      Limit: 1,
    }));

    const ticket = result.Items?.[0];
    if (!ticket) {
      return notFoundResponse('Ticket not found');
    }

    // Users can only view their own tickets; admins can view all
    if (auth.role !== 'ADMIN' && ticket['userEmail'] !== auth.email) {
      return forbiddenResponse('Access denied');
    }

    return successResponse({
      id: ticket['id'],
      eventId: ticket['eventId'],
      userId: ticket['userId'],
      userEmail: ticket['userEmail'],
      userName: ticket['userName'],
      purchaseDate: ticket['purchaseDate'],
      status: ticket['status'],
      isComp: ticket['isComp'],
      compIssuedBy: ticket['compIssuedBy'],
      compReason: ticket['compReason'],
      stripePaymentIntentId: ticket['stripePaymentIntentId'],
      qrCodeData: ticket['qrCodeData'],
      checkedInAt: ticket['checkedInAt'],
      checkedInBy: ticket['checkedInBy'],
      quantity: ticket['quantity'],
      amountPaid: ticket['amountPaid'],
      createdAt: ticket['createdAt'],
    });
  } catch (error) {
    console.error('Error getting ticket:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to get ticket');
  }
};
