export interface AppConfig {
  apiUrl: string;
  userPoolId: string;
  userPoolClientId: string;
  region: string;
  stripePublishableKey?: string;
}

let cachedConfig: AppConfig | null = null;

export async function loadConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;

  const response = await fetch('/config.json');
  if (!response.ok) {
    throw new Error(`Failed to load config: ${response.status}`);
  }
  cachedConfig = (await response.json()) as AppConfig;
  return cachedConfig;
}
