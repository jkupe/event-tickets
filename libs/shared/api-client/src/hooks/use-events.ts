import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type {
  ListEventsResponse,
  GetEventResponse,
  CreateEventResponse,
  UpdateEventResponse,
  CreateEventInput,
  UpdateEventInput,
} from '@event-tickets/shared-types';

export function useEvents(status?: string) {
  return useQuery({
    queryKey: ['events', status],
    queryFn: () => api.get<ListEventsResponse>(`/events${status ? `?status=${status}` : ''}`),
  });
}

export function useEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ['events', eventId],
    queryFn: () => api.get<GetEventResponse>(`/events/${eventId}`),
    enabled: !!eventId,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEventInput) => api.post<CreateEventResponse>('/events', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateEvent(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateEventInput) => api.put<UpdateEventResponse>(`/events/${eventId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => api.delete(`/events/${eventId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
