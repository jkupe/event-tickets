import type { Event, Ticket, User } from './entities';

// API Response types
export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  nextToken?: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

// Event API
export type ListEventsResponse = ApiListResponse<Event>;
export type GetEventResponse = ApiResponse<Event>;
export type CreateEventResponse = ApiResponse<Event>;
export type UpdateEventResponse = ApiResponse<Event>;

// Ticket API
export interface CreateCheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
  ticketId: string;
}

export type ListTicketsResponse = ApiListResponse<Ticket>;
export type GetTicketResponse = ApiResponse<Ticket>;

export interface ValidateTicketResponse {
  valid: boolean;
  ticketId?: string;
  userName?: string;
  eventName?: string;
  reason?: 'ALREADY_CHECKED_IN' | 'INVALID' | 'EXPIRED' | 'EVENT_MISMATCH' | 'NOT_FOUND';
}

// User API
export type GetUserProfileResponse = ApiResponse<User>;
export type UpdateUserProfileResponse = ApiResponse<User>;
