export enum EventStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  SOLD_OUT = 'SOLD_OUT',
  CANCELLED = 'CANCELLED',
  PAST = 'PAST',
}

export enum TicketStatus {
  PENDING = 'PENDING',
  VALID = 'VALID',
  USED = 'USED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  GREETER = 'GREETER',
}
