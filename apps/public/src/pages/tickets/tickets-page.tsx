import { Link } from 'react-router';
import { useMyTickets } from '@event-tickets/shared-api-client';
import { Card, CardContent, LoadingSpinner, EmptyState, PageHeader, StatusBadge } from '@event-tickets/shared-ui';
import { formatShortDate } from '@event-tickets/shared-utils';
import { Ticket, CalendarX } from 'lucide-react';

export function TicketsPage() {
  const { data, isLoading } = useMyTickets();
  const tickets = data?.data || [];

  if (isLoading) return <LoadingSpinner className="py-20" />;

  return (
    <div>
      <PageHeader title="My Tickets" description="View all your purchased and complimentary tickets" />
      {tickets.length === 0 ? (
        <EmptyState
          icon={<CalendarX className="h-12 w-12" />}
          title="No tickets yet"
          description="Purchase tickets for upcoming events to see them here."
          action={<Link to="/events"><button className="text-blue-900 font-medium hover:underline">Browse Events</button></Link>}
        />
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Link key={ticket.id} to={`/tickets/${ticket.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Ticket className="h-8 w-8 text-blue-900" />
                    <div>
                      <p className="font-medium text-gray-900">Ticket {ticket.id}</p>
                      <p className="text-sm text-gray-500">
                        Purchased {formatShortDate(ticket.createdAt)}
                        {ticket.isComp && ' (Comp)'}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={ticket.status} type="ticket" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
