import { useParams, Link } from 'react-router';
import { useEvent } from '@event-tickets/shared-api-client';
import { Button, Card, CardContent, CardHeader, CardTitle, LoadingSpinner, StatusBadge, StatCard } from '@event-tickets/shared-ui';
import { formatEventDateTime, formatCents } from '@event-tickets/shared-utils';
import { Edit, Ticket, Gift, Calendar, MapPin } from 'lucide-react';

export function EventDetailPage() {
  const { eventId } = useParams();
  const { data, isLoading } = useEvent(eventId);
  const event = data?.data;

  if (isLoading) return <LoadingSpinner className="py-20" />;
  if (!event) return <div className="text-center py-20 text-gray-500">Event not found</div>;

  const available = event.capacity
    ? event.capacity - event.ticketsSold - event.compTicketsIssued
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
          <StatusBadge status={event.status} type="event" />
        </div>
        <div className="flex gap-2">
          <Link to={`/events/${eventId}/edit`}>
            <Button variant="outline"><Edit className="h-4 w-4 mr-1" /> Edit</Button>
          </Link>
          <Link to={`/events/${eventId}/tickets`}>
            <Button variant="outline"><Ticket className="h-4 w-4 mr-1" /> Tickets</Button>
          </Link>
          <Link to={`/events/${eventId}/tickets/comp`}>
            <Button variant="outline"><Gift className="h-4 w-4 mr-1" /> Issue Comp</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <StatCard title="Tickets Sold" value={event.ticketsSold} />
        <StatCard title="Comp Tickets" value={event.compTicketsIssued} />
        <StatCard title="Revenue" value={formatCents(event.ticketsSold * event.price)} />
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>{formatEventDateTime(event.date)} - {formatEventDateTime(event.endDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span>{event.location}</span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Price: {formatCents(event.price)} · 
            Capacity: {event.capacity || 'Unlimited'} · 
            Available: {available ?? 'Unlimited'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
