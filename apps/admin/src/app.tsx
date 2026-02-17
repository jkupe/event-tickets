import { Routes, Route } from 'react-router';
import { useEffect } from 'react';
import { useAuthStore, RequireAuth } from '@event-tickets/shared-auth';
import { UserRole } from '@event-tickets/shared-types';
import { AdminLayout } from './components/admin-layout';
import { DashboardPage } from './pages/dashboard/dashboard-page';
import { EventsListPage } from './pages/events/events-list-page';
import { CreateEventPage } from './pages/events/create-event-page';
import { EditEventPage } from './pages/events/edit-event-page';
import { EventDetailPage } from './pages/events/event-detail-page';
import { EventTicketsPage } from './pages/events/event-tickets-page';
import { CompTicketPage } from './pages/events/comp-ticket-page';
import { SignInPage } from './pages/auth/sign-in-page';

export function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Routes>
      <Route path="auth/sign-in" element={<SignInPage />} />
      <Route element={<RequireAuth allowedRoles={[UserRole.ADMIN]}><AdminLayout /></RequireAuth>}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route index element={<DashboardPage />} />
        <Route path="events" element={<EventsListPage />} />
        <Route path="events/new" element={<CreateEventPage />} />
        <Route path="events/:eventId" element={<EventDetailPage />} />
        <Route path="events/:eventId/edit" element={<EditEventPage />} />
        <Route path="events/:eventId/tickets" element={<EventTicketsPage />} />
        <Route path="events/:eventId/tickets/comp" element={<CompTicketPage />} />
      </Route>
    </Routes>
  );
}
