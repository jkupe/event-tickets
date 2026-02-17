import { EventStatus, TicketStatus, UserRole } from './enums';

export interface Event {
  id: string;
  name: string;
  description: string;
  date: string; // ISO 8601
  endDate: string; // ISO 8601
  location: string;
  price: number; // cents
  capacity: number | null; // null = unlimited
  ticketsSold: number;
  compTicketsIssued: number;
  status: EventStatus;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Ticket {
  id: string;
  eventId: string;
  userId: string;
  userEmail: string;
  userName: string;
  purchaseDate: string;
  status: TicketStatus;
  isComp: boolean;
  compIssuedBy: string | null;
  compReason: string | null;
  stripePaymentIntentId: string | null;
  stripeCheckoutSessionId: string | null;
  qrCodeData: string | null; // JWT
  checkedInAt: string | null;
  checkedInBy: string | null;
  quantity: number;
  amountPaid: number; // cents
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  cognitoSub: string;
  stripeCustomerId: string | null;
  createdAt: string;
}
