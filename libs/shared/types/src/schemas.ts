import { z } from 'zod';
import { EventStatus, TicketStatus, UserRole } from './enums';

// Event schemas
export const createEventSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  date: z.string().datetime(),
  endDate: z.string().datetime(),
  location: z.string().min(1).max(500),
  price: z.number().int().min(0),
  capacity: z.number().int().positive().nullable(),
  imageUrl: z.string().url().nullable().optional(),
});

export const updateEventSchema = createEventSchema.partial().extend({
  status: z.nativeEnum(EventStatus).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

// Ticket schemas
export const createCheckoutSchema = z.object({
  quantity: z.number().int().min(1).max(10).default(1),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;

export const issueCompTicketSchema = z.object({
  userEmail: z.string().email(),
  userName: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(10).default(1),
  reason: z.string().min(1).max(500),
});

export type IssueCompTicketInput = z.infer<typeof issueCompTicketSchema>;

export const validateTicketSchema = z.object({
  qrToken: z.string().min(1),
});

export type ValidateTicketInput = z.infer<typeof validateTicketSchema>;

// User schemas
export const updateUserProfileSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(20).nullable().optional(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
