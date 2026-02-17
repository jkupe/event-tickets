export interface AuthConfig {
  userPoolId: string;
  userPoolClientId: string;
  region: string;
}

let authConfig: AuthConfig | null = null;

export function configureAuth(config: AuthConfig) {
  authConfig = config;
}

export function getAuthConfig(): AuthConfig {
  if (!authConfig) {
    throw new Error('Auth not configured. Call configureAuth() first.');
  }
  return authConfig;
}
