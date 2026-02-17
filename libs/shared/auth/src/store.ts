import { create } from 'zustand';
import { UserRole } from '@event-tickets/shared-types';
import { getIdToken, getSession, getUser, signOut as amplifySignOut } from './amplify';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  email: string | null;
  name: string | null;
  role: UserRole;
  groups: string[];
  idToken: string | null;

  initialize: () => Promise<void>;
  setAuthenticated: (data: {
    userId: string;
    email: string;
    name: string;
    role: UserRole;
    groups: string[];
    idToken: string;
  }) => void;
  refreshToken: () => Promise<string | null>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  userId: null,
  email: null,
  name: null,
  role: UserRole.USER,
  groups: [],
  idToken: null,

  initialize: async () => {
    try {
      const user = await getUser();
      if (!user) {
        set({ isAuthenticated: false, isLoading: false });
        return;
      }

      const session = await getSession();
      if (!session?.tokens?.idToken) {
        set({ isAuthenticated: false, isLoading: false });
        return;
      }

      const idToken = session.tokens.idToken.toString();
      const payload = session.tokens.idToken.payload;

      const groups = (payload['cognito:groups'] as string[] | undefined) || [];
      let role = UserRole.USER;
      if (groups.includes('admin')) role = UserRole.ADMIN;
      else if (groups.includes('greeter')) role = UserRole.GREETER;

      set({
        isAuthenticated: true,
        isLoading: false,
        userId: payload['sub'] as string,
        email: (payload['email'] as string) || null,
        name: (payload['name'] as string) || null,
        role,
        groups,
        idToken,
      });
    } catch {
      set({ isAuthenticated: false, isLoading: false });
    }
  },

  setAuthenticated: (data) => {
    set({
      isAuthenticated: true,
      isLoading: false,
      ...data,
    });
  },

  refreshToken: async () => {
    const token = await getIdToken();
    if (token) {
      set({ idToken: token });
    }
    return token;
  },

  logout: async () => {
    await amplifySignOut();
    set({
      isAuthenticated: false,
      isLoading: false,
      userId: null,
      email: null,
      name: null,
      role: UserRole.USER,
      groups: [],
      idToken: null,
    });
  },
}));
