import { useParams, Link } from 'react-router';
import { useTicketsByEvent, useEvent } from '@event-tickets/shared-api-client';
import { Card, CardContent, LoadingSpinner, PageHeader, StatusBadge, EmptyState, Button } from '@event-tickets/shared-ui';
import { formatTimestamp, formatCents } from '@event-tickets/shared-utils';
import { Ticket, Gift } from 'lucide-react';

export function EventTicketsPage() {
  const { eventId } = useParams();
  const { data: eventData } = useEvent(eventId);
  const { data, isLoading } = useTicketsByEvent(eventId);
  const tickets = data?.data || [];

  if (isLoading) return <LoadingSpinner className="py-20" />;

  return (
    <div>
      <PageHeader
        title={`Tickets - ${eventData?.data?.name || ''}`}
        description={`${tickets.length} total tickets`}
        actions={
          <Link to={`/events/${eventId}/tickets/comp`}>
            <Button><Gift className="h-4 w-4 mr-1" /> Issue Comp Ticket</Button>
          </Link>
        }
      />

      {tickets.length === 0 ? (
        <EmptyState
          icon={<Ticket className="h-12 w-12" />}
          title="No tickets yet"
          description="Tickets will appear here when purchased or issued."
        />
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{ticket.userEmail}</p>
                    <StatusBadge status={ticket.status} type="ticket" />
                    {ticket.isComp && <span className="text-xs text-purple-600 font-medium">COMP</span>}
                  </div>
                  <p className="text-sm text-gray-500">
                    {ticket.id} · {formatTimestamp(ticket.createdAt)} · Qty: {ticket.quantity}
                    {!ticket.isComp && ` · ${formatCents(ticket.amountPaid)}`}
                  </p>
                  {ticket.checkedInAt && (
                    <p className="text-xs text-green-600">Checked in: {formatTimestamp(ticket.checkedInAt)}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
