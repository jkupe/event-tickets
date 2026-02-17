import { Link } from 'react-router';
import { Button, Card, CardContent } from '@event-tickets/shared-ui';
import { useEvents } from '@event-tickets/shared-api-client';
import { formatEventDate, formatCents } from '@event-tickets/shared-utils';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';

export function HomePage() {
  const { data, isLoading } = useEvents('ACTIVE');
  const events = data?.data?.slice(0, 3) || [];

  return (
    <div>
      <section className="text-center py-12 sm:py-20">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          First Baptist Church<br />of Pittsfield
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          Purchase tickets for upcoming events, concerts, and gatherings.
        </p>
        <Link to="/events">
          <Button size="lg">
            Browse Events
            <ArrowRight className="h-5 w-5 ml-1" />
          </Button>
        </Link>
      </section>

      {events.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Events</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link key={event.id} to={`/events/${event.id}`}>
                <Card className="hover:shadow-md transition-shadow h-full">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.name}</h3>
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
                    <div className="mt-4 text-lg font-bold text-blue-900">
                      {event.price === 0 ? 'Free' : formatCents(event.price)}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/events">
              <Button variant="outline">View All Events</Button>
            </Link>
          </div>
        </section>
      )}

      {!isLoading && events.length === 0 && (
        <section className="text-center py-12">
          <p className="text-gray-500">No upcoming events at this time. Check back soon!</p>
        </section>
      )}
    </div>
  );
}
