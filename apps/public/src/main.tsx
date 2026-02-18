import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initializeAmplify, loadConfig } from '@event-tickets/shared-auth';
import { configureApiClient } from '@event-tickets/shared-api-client';
import { App } from './app';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

async function bootstrap() {
  const config = await loadConfig();
  initializeAmplify({
    userPoolId: config.userPoolId,
    userPoolClientId: config.userPoolClientId,
    region: config.region,
  });
  configureApiClient(config.apiUrl);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>
  );
}

bootstrap();
