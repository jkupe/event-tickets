import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initializeAmplify } from '@event-tickets/shared-auth';
import { configureApiClient } from '@event-tickets/shared-api-client';
import { App } from './app';
import './styles.css';

initializeAmplify({
  userPoolId: import.meta.env.VITE_USER_POOL_ID || '',
  userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || '',
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
});

configureApiClient(import.meta.env.VITE_API_URL || '');

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 0, retry: 1 } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
