import type { LiveFeedEvent, PublicAttendee } from "./types";

type Listener = (event: LiveFeedEvent) => void;

const listeners = new Set<Listener>();

export function subscribeToCheckInFeed(listener: Listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function publishCheckIn(attendee: PublicAttendee) {
  const payload: LiveFeedEvent = {
    type: "check-in",
    attendee,
    emittedAt: new Date().toISOString()
  };

  listeners.forEach((listener) => {
    listener(payload);
  });
}
