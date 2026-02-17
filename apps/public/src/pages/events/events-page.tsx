import { Link } from 'react-router';
import { useEvents } from '@event-tickets/shared-api-client';
import { Card, CardContent, LoadingSpinner, EmptyState, PageHeader } from '@event-tickets/shared-ui';
import { formatEventDate, formatCents } from '@event-tickets/shared-utils';
import { Calendar, MapPin, CalendarX } from 'lucide-react';

export function EventsPage() {
  const { data, isLoading } = useEvents('ACTIVE');
  const events = data?.data || [];

  if (isLoading) return <LoadingSpinner className="py-20" />;

  return (
    <div>
      <PageHeader title="Events" description="Browse and purchase tickets for upcoming events" />
      {events.length === 0 ? (
        <EmptyState
          icon={<CalendarX className="h-12 w-12" />}
          title="No events available"
          description="Check back soon for upcoming events!"
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link key={event.id} to={`/events/${event.id}`}>
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.name}</h3>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{event.description}</p>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatEventDate(event.date)}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-lg font-bold text-blue-900">
                      {event.price === 0 ? 'Free' : formatCents(event.price)}
                    </span>
                    {event.capacity && (
                      <span className="text-xs text-gray-400">
                        {event.capacity - event.ticketsSold - event.compTicketsIssued} remaining
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
