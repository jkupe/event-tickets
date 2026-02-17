import { Link } from 'react-router';
import { useEvents, useDeleteEvent } from '@event-tickets/shared-api-client';
import { Button, Card, CardContent, LoadingSpinner, PageHeader, StatusBadge, EmptyState } from '@event-tickets/shared-ui';
import { formatShortDate, formatCents } from '@event-tickets/shared-utils';
import { Plus, Calendar, Edit, Ticket, Eye } from 'lucide-react';
import { useState } from 'react';
import { EventStatus } from '@event-tickets/shared-types';

export function EventsListPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data: activeData, isLoading: loadingActive } = useEvents(EventStatus.ACTIVE);
  const { data: draftData } = useEvents(EventStatus.DRAFT);
  const { data: cancelledData } = useEvents(EventStatus.CANCELLED);

  const allEvents = [
    ...(activeData?.data || []),
    ...(draftData?.data || []),
    ...(cancelledData?.data || []),
  ];

  const filteredEvents = statusFilter
    ? allEvents.filter(e => e.status === statusFilter)
    : allEvents;

  if (loadingActive) return <LoadingSpinner className="py-20" />;

  return (
    <div>
      <PageHeader
        title="Events"
        description="Manage your events"
        actions={
          <Link to="/events/new">
            <Button><Plus className="h-4 w-4 mr-1" /> Create Event</Button>
          </Link>
        }
      />

      <div className="flex gap-2 mb-4">
        {['', EventStatus.ACTIVE, EventStatus.DRAFT, EventStatus.CANCELLED].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status || 'All'}
          </Button>
        ))}
      </div>

      {filteredEvents.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title="No events found"
          action={<Link to="/events/new"><Button>Create Event</Button></Link>}
        />
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <Card key={event.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900">{event.name}</h3>
                    <StatusBadge status={event.status} type="event" />
                  </div>
                  <p className="text-sm text-gray-500">
                    {formatShortDate(event.date)} · {formatCents(event.price)} · {event.ticketsSold} sold
                    {event.capacity && ` / ${event.capacity}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/events/${event.id}`}>
                    <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                  </Link>
                  <Link to={`/events/${event.id}/edit`}>
                    <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                  </Link>
                  <Link to={`/events/${event.id}/tickets`}>
                    <Button variant="ghost" size="icon"><Ticket className="h-4 w-4" /></Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
