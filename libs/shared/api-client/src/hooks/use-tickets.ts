import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type {
  ListTicketsResponse,
  GetTicketResponse,
  CreateCheckoutResponse,
  CreateCheckoutInput,
  IssueCompTicketInput,
  ValidateTicketInput,
  ValidateTicketResponse,
} from '@event-tickets/shared-types';

export function useTicketsByEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ['tickets', 'event', eventId],
    queryFn: () => api.get<ListTicketsResponse>(`/events/${eventId}/tickets`),
    enabled: !!eventId,
  });
}

export function useMyTickets() {
  return useQuery({
    queryKey: ['tickets', 'mine'],
    queryFn: () => api.get<ListTicketsResponse>('/users/me/tickets'),
  });
}

export function useTicket(ticketId: string | undefined) {
  return useQuery({
    queryKey: ['tickets', ticketId],
    queryFn: () => api.get<GetTicketResponse>(`/tickets/${ticketId}`),
    enabled: !!ticketId,
  });
}

export function useCreateCheckout(eventId: string) {
  return useMutation({
    mutationFn: (data: CreateCheckoutInput) =>
      api.post<CreateCheckoutResponse>(`/events/${eventId}/checkout`, data),
  });
}

export function useIssueCompTicket(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IssueCompTicketInput) =>
      api.post(`/events/${eventId}/tickets/comp`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', 'event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events', eventId] });
    },
  });
}

export function useValidateTicket() {
  return useMutation({
    mutationFn: ({ ticketId, data }: { ticketId: string; data: ValidateTicketInput }) =>
      api.post<ValidateTicketResponse>(`/tickets/${ticketId}/validate`, data),
  });
}
