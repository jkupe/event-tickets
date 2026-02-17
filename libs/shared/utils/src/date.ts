import { format, parseISO, isPast, isFuture, isWithinInterval } from 'date-fns';

export function formatEventDate(isoDate: string): string {
  return format(parseISO(isoDate), 'EEEE, MMMM d, yyyy');
}

export function formatEventTime(isoDate: string): string {
  return format(parseISO(isoDate), 'h:mm a');
}

export function formatEventDateTime(isoDate: string): string {
  return format(parseISO(isoDate), 'EEEE, MMMM d, yyyy \'at\' h:mm a');
}

export function formatShortDate(isoDate: string): string {
  return format(parseISO(isoDate), 'MMM d, yyyy');
}

export function formatTimestamp(isoDate: string): string {
  return format(parseISO(isoDate), 'MMM d, yyyy h:mm a');
}

export function isEventPast(endDate: string): boolean {
  return isPast(parseISO(endDate));
}

export function isEventUpcoming(date: string): boolean {
  return isFuture(parseISO(date));
}

export function isEventOngoing(startDate: string, endDate: string): boolean {
  return isWithinInterval(new Date(), {
    start: parseISO(startDate),
    end: parseISO(endDate),
  });
}
