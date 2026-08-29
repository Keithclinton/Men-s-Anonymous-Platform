import type { Booking, SessionChannelType } from '../api/types';

export function bookingChannel(booking: Booking): SessionChannelType {
  return booking.session?.channelType ?? booking.channelType ?? 'CHAT';
}

export function sessionIsLive(booking: Booking): boolean {
  return Boolean(booking.session?.startedAt && !booking.session.endedAt);
}

export function sessionHasEnded(booking: Booking): boolean {
  return Boolean(booking.session?.endedAt);
}

export function sessionEndsAt(booking: Booking): Date {
  const start = new Date(booking.session?.startedAt ?? booking.scheduledStart);
  return new Date(start.getTime() + booking.durationMin * 60_000);
}
