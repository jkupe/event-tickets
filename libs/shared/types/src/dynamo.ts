// DynamoDB key patterns for single-table design

export interface DynamoKeys {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  GSI2PK?: string;
  GSI2SK?: string;
}

export const TABLE_NAME = process.env['TABLE_NAME'] || 'EventTickets';

export const keys = {
  event: {
    pk: (eventId: string) => `EVENT#${eventId}`,
    sk: () => '#METADATA',
    gsi1pk: () => 'EVENTS',
    gsi1sk: (status: string, date: string) => `${status}#${date}`,
  },
  ticket: {
    pk: (eventId: string) => `EVENT#${eventId}`,
    sk: (ticketId: string) => `TICKET#${ticketId}`,
    gsi1pk: (userId: string) => `USER#${userId}`,
    gsi1sk: (eventDate: string) => `TICKET#${eventDate}`,
    gsi2pk: (ticketId: string) => `TICKET#${ticketId}`,
    gsi2sk: (ticketId: string) => ticketId,
  },
  user: {
    pk: (userId: string) => `USER#${userId}`,
    sk: () => '#PROFILE',
    gsi1pk: (email: string) => `EMAIL#${email}`,
    gsi1sk: (userId: string) => `USER#${userId}`,
  },
} as const;
