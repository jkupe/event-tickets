import { useEvents } from '@event-tickets/shared-api-client';
import { PageHeader, StatCard, LoadingSpinner } from '@event-tickets/shared-ui';
import { Calendar, Ticket, DollarSign, Users } from 'lucide-react';
import { EventStatus } from '@event-tickets/shared-types';
import { formatCents } from '@event-tickets/shared-utils';

export function DashboardPage() {
  const { data: activeEvents, isLoading: loadingActive } = useEvents(EventStatus.ACTIVE);
  const { data: draftEvents } = useEvents(EventStatus.DRAFT);

  if (loadingActive) return <LoadingSpinner className="py-20" />;

  const active = activeEvents?.data || [];
  const drafts = draftEvents?.data || [];

  const totalTicketsSold = active.reduce((sum, e) => sum + e.ticketsSold, 0);
  const totalRevenue = active.reduce((sum, e) => sum + e.ticketsSold * e.price, 0);
  const totalCompTickets = active.reduce((sum, e) => sum + e.compTicketsIssued, 0);

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your events and ticket sales" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Active Events" value={active.length} icon={<Calendar className="h-8 w-8" />} />
        <StatCard title="Tickets Sold" value={totalTicketsSold} icon={<Ticket className="h-8 w-8" />} />
        <StatCard title="Revenue" value={formatCents(totalRevenue)} icon={<DollarSign className="h-8 w-8" />} />
        <StatCard title="Comp Tickets" value={totalCompTickets} icon={<Users className="h-8 w-8" />} />
      </div>
      {drafts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Draft Events ({drafts.length})</h2>
          <p className="text-sm text-gray-500">These events are not yet visible to the public. Edit them and set status to Active to publish.</p>
        </div>
      )}
    </div>
  );
}
