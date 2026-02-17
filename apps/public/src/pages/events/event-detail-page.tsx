import { useParams, useNavigate } from 'react-router';
import { useEvent, useCreateCheckout } from '@event-tickets/shared-api-client';
import { useAuthStore } from '@event-tickets/shared-auth';
import { Button, Card, CardContent, CardHeader, CardTitle, LoadingSpinner, Badge } from '@event-tickets/shared-ui';
import { formatEventDateTime, formatCents } from '@event-tickets/shared-utils';
import { Calendar, MapPin, Users, DollarSign } from 'lucide-react';

export function EventDetailPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { data, isLoading } = useEvent(eventId);
  const checkout = useCreateCheckout(eventId!);
  const event = data?.data;

  if (isLoading) return <LoadingSpinner className="py-20" />;
  if (!event) return <div className="text-center py-20 text-gray-500">Event not found</div>;

  const available = event.capacity ? event.capacity - event.ticketsSold - event.compTicketsIssued : null;

  const handleBuyTicket = async () => {
    if (!isAuthenticated) {
      navigate('/auth/sign-in', { state: { from: { pathname: `/events/${eventId}` } } });
      return;
    }

    try {
      const result = await checkout.mutateAsync({ quantity: 1 });
      window.location.href = result.checkoutUrl;
    } catch (err) {
      console.error('Checkout failed:', err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-3xl">{event.name}</CardTitle>
            {event.status !== 'ACTIVE' && <Badge variant="secondary">{event.status}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{formatEventDateTime(event.date)}</p>
                <p className="text-xs text-gray-500">to {formatEventDateTime(event.endDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <p className="text-sm text-gray-900">{event.location}</p>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <p className="text-sm text-gray-900">{event.price === 0 ? 'Free' : formatCents(event.price)}</p>
            </div>
            {event.capacity && (
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-gray-400" />
                <p className="text-sm text-gray-900">{available} of {event.capacity} spots available</p>
              </div>
            )}
          </div>

          {event.status === 'ACTIVE' && (available === null || available > 0) && (
            <Button
              size="lg"
              className="w-full"
              onClick={handleBuyTicket}
              disabled={checkout.isPending}
            >
              {checkout.isPending ? 'Preparing checkout...' : event.price === 0 ? 'Get Free Ticket' : `Buy Ticket - ${formatCents(event.price)}`}
            </Button>
          )}

          {available !== null && available <= 0 && (
            <div className="text-center py-4">
              <Badge variant="warning">Sold Out</Badge>
            </div>
          )}

          {checkout.isError && (
            <p className="text-red-600 text-sm text-center">{(checkout.error as Error).message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
