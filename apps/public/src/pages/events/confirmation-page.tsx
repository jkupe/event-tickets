import { useParams, useSearchParams, Link } from 'react-router';
import { useTicket, useEvent } from '@event-tickets/shared-api-client';
import { Card, CardContent, CardHeader, CardTitle, Button, LoadingSpinner, Badge } from '@event-tickets/shared-ui';
import { formatEventDateTime } from '@event-tickets/shared-utils';
import { CheckCircle, Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ConfirmationPage() {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const ticketId = searchParams.get('ticketId');
  const { data: ticketData, refetch } = useTicket(ticketId || undefined);
  const { data: eventData } = useEvent(eventId);
  const ticket = ticketData?.data;
  const event = eventData?.data;
  const [pollCount, setPollCount] = useState(0);

  // Poll for ticket to become VALID (webhook may not have fired yet)
  useEffect(() => {
    if (ticket?.status === 'VALID' || ticket?.status === 'USED' || pollCount > 20) return;
    const timer = setTimeout(() => {
      refetch();
      setPollCount((c) => c + 1);
    }, 2000);
    return () => clearTimeout(timer);
  }, [ticket, pollCount, refetch]);

  if (!ticket || ticket.status === 'PENDING') {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <LoadingSpinner className="mb-4" />
        <p className="text-gray-600">Confirming your payment...</p>
        <p className="text-sm text-gray-400 mt-2">This usually takes a few seconds.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-2xl">Ticket Confirmed!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {event && (
            <>
              <h3 className="text-lg font-semibold">{event.name}</h3>
              <p className="text-sm text-gray-600">{formatEventDateTime(event.date)}</p>
              <p className="text-sm text-gray-600">{event.location}</p>
            </>
          )}
          <Badge variant="success">Confirmed</Badge>
          <p className="text-sm text-gray-500">
            A confirmation email with your QR code has been sent.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Link to={`/tickets/${ticket.id}`}>
              <Button>
                <Ticket className="h-4 w-4 mr-1" />
                View Ticket
              </Button>
            </Link>
            <Link to="/events">
              <Button variant="outline">Browse Events</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
