import { Badge } from './badge';
import { EventStatus, TicketStatus } from '@event-tickets/shared-types';

const eventStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline' }> = {
  [EventStatus.DRAFT]: { label: 'Draft', variant: 'secondary' },
  [EventStatus.ACTIVE]: { label: 'Active', variant: 'success' },
  [EventStatus.SOLD_OUT]: { label: 'Sold Out', variant: 'warning' },
  [EventStatus.CANCELLED]: { label: 'Cancelled', variant: 'destructive' },
  [EventStatus.PAST]: { label: 'Past', variant: 'outline' },
};

const ticketStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline' }> = {
  [TicketStatus.PENDING]: { label: 'Pending', variant: 'warning' },
  [TicketStatus.VALID]: { label: 'Valid', variant: 'success' },
  [TicketStatus.USED]: { label: 'Used', variant: 'secondary' },
  [TicketStatus.CANCELLED]: { label: 'Cancelled', variant: 'destructive' },
  [TicketStatus.REFUNDED]: { label: 'Refunded', variant: 'outline' },
};

interface StatusBadgeProps {
  status: string;
  type: 'event' | 'ticket';
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const config = type === 'event' ? eventStatusConfig[status] : ticketStatusConfig[status];
  if (!config) return <Badge variant="outline">{status}</Badge>;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
