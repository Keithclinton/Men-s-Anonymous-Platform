const PREFIX = 'map.remind.';

export function reminderOn(bookingId: string) {
  try {
    return localStorage.getItem(PREFIX + bookingId) === '1';
  } catch {
    return false;
  }
}

export function setReminderLocal(bookingId: string, on: boolean) {
  if (on) localStorage.setItem(PREFIX + bookingId, '1');
  else localStorage.removeItem(PREFIX + bookingId);
}

const TOUR = 'map.tour.v1';

export function tourSeen() {
  try {
    return localStorage.getItem(TOUR) === '1';
  } catch {
    return true;
  }
}

export function markTourSeen() {
  localStorage.setItem(TOUR, '1');
}

export const SESSION_EXPIRED_KEY = 'map.sessionExpired';
