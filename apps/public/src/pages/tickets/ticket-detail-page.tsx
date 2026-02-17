import { useParams } from 'react-router';
import { useTicket, useEvent } from '@event-tickets/shared-api-client';
import { Card, CardContent, CardHeader, CardTitle, LoadingSpinner, StatusBadge } from '@event-tickets/shared-ui';
import { formatEventDateTime, formatCents } from '@event-tickets/shared-utils';
import { QRCodeSVG } from 'qrcode.react';

export function TicketDetailPage() {
  const { ticketId } = useParams();
  const { data: ticketData, isLoading } = useTicket(ticketId);
  const ticket = ticketData?.data;
  const { data: eventData } = useEvent(ticket?.eventId);
  const event = eventData?.data;

  if (isLoading) return <LoadingSpinner className="py-20" />;
  if (!ticket) return <div className="text-center py-20 text-gray-500">Ticket not found</div>;

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>
            {event?.name || 'Event Ticket'}
          </CardTitle>
          <StatusBadge status={ticket.status} type="ticket" />
        </CardHeader>
        <CardContent className="space-y-6">
          {event && (
            <div className="text-center text-sm text-gray-600 space-y-1">
              <p>{formatEventDateTime(event.date)}</p>
              <p>{event.location}</p>
            </div>
          )}

          {ticket.qrCodeData && ticket.status === 'VALID' && (
            <div className="flex justify-center py-4">
              <div className="bg-white p-4 rounded-lg border">
                <QRCodeSVG value={ticket.qrCodeData} size={250} level="M" />
              </div>
            </div>
          )}

          {ticket.status === 'USED' && (
            <div className="text-center py-4 text-gray-500">
              <p>This ticket has been checked in.</p>
              {ticket.checkedInAt && <p className="text-xs mt-1">Checked in at {formatEventDateTime(ticket.checkedInAt)}</p>}
            </div>
          )}

          <div className="border-t pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Ticket ID</span>
              <span className="font-mono text-gray-900">{ticket.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="text-gray-900">{ticket.isComp ? 'Complimentary' : formatCents(ticket.amountPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Quantity</span>
              <span className="text-gray-900">{ticket.quantity}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
