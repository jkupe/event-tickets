import { Amplify } from 'aws-amplify';
import {
  signIn as amplifySignIn,
  signUp as amplifySignUp,
  signOut as amplifySignOut,
  confirmSignUp as amplifyConfirmSignUp,
  resetPassword as amplifyResetPassword,
  confirmResetPassword as amplifyConfirmResetPassword,
  fetchAuthSession,
  getCurrentUser,
} from 'aws-amplify/auth';
import type { AuthConfig } from './config';

export function initializeAmplify(config: AuthConfig) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.userPoolId,
        userPoolClientId: config.userPoolClientId,
      },
    },
  });
}

export async function signIn(email: string, password: string) {
  return amplifySignIn({ username: email, password });
}

export async function signUp(email: string, password: string, name: string) {
  return amplifySignUp({
    username: email,
    password,
    options: {
      userAttributes: {
        email,
        name,
      },
    },
  });
}

export async function confirmSignUp(email: string, code: string) {
  return amplifyConfirmSignUp({ username: email, confirmationCode: code });
}

export async function signOut() {
  return amplifySignOut();
}

export async function resetPassword(email: string) {
  return amplifyResetPassword({ username: email });
}

export async function confirmResetPassword(email: string, code: string, newPassword: string) {
  return amplifyConfirmResetPassword({
    username: email,
    confirmationCode: code,
    newPassword,
  });
}

export async function getSession() {
  try {
    const session = await fetchAuthSession();
    return session;
  } catch {
    return null;
  }
}

export async function getIdToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || null;
  } catch {
    return null;
  }
}

export async function getUser() {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export { fetchAuthSession };
