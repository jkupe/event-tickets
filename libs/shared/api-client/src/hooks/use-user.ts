import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type { GetUserProfileResponse, UpdateUserProfileResponse, UpdateUserProfileInput } from '@event-tickets/shared-types';

export function useUserProfile() {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => api.get<GetUserProfileResponse>('/users/me'),
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUserProfileInput) =>
      api.put<UpdateUserProfileResponse>('/users/me', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
  });
}
