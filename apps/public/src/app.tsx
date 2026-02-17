import { Routes, Route } from 'react-router';
import { useEffect } from 'react';
import { useAuthStore, RequireAuth } from '@event-tickets/shared-auth';
import { Layout } from './components/layout';
import { HomePage } from './pages/home';
import { EventsPage } from './pages/events/events-page';
import { EventDetailPage } from './pages/events/event-detail-page';
import { ConfirmationPage } from './pages/events/confirmation-page';
import { TicketsPage } from './pages/tickets/tickets-page';
import { TicketDetailPage } from './pages/tickets/ticket-detail-page';
import { SignInPage } from './pages/auth/sign-in-page';
import { SignUpPage } from './pages/auth/sign-up-page';
import { ConfirmPage } from './pages/auth/confirm-page';
import { ForgotPasswordPage } from './pages/auth/forgot-password-page';

export function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/:eventId" element={<EventDetailPage />} />
        <Route path="events/:eventId/confirmation" element={<RequireAuth><ConfirmationPage /></RequireAuth>} />
        <Route path="tickets" element={<RequireAuth><TicketsPage /></RequireAuth>} />
        <Route path="tickets/:ticketId" element={<RequireAuth><TicketDetailPage /></RequireAuth>} />
        <Route path="auth/sign-in" element={<SignInPage />} />
        <Route path="auth/sign-up" element={<SignUpPage />} />
        <Route path="auth/confirm" element={<ConfirmPage />} />
        <Route path="auth/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
    </Routes>
  );
}
