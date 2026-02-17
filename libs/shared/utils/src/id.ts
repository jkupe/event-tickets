import { v4 as uuidv4 } from 'uuid';

export function generateEventId(): string {
  return `evt_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
}

export function generateTicketId(): string {
  return `tkt_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
}

export function generateUserId(): string {
  return `usr_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
}
