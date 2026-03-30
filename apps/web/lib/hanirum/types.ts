export type CheckInMode = "google-sheets" | "demo";

export type CheckInStatus = "success" | "already_checked_in" | "not_found" | "ambiguous";

export interface AttendeeRecord {
  id: string;
  rowIndex: number;
  name: string;
  email: string;
  phone: string;
  dinner: boolean;
  checkInStatus: string;
  checkedIn: boolean;
}

export interface PublicAttendee {
  id: string;
  name: string;
  dinner: boolean;
  checkedIn: boolean;
}

export interface CheckInState {
  attendees: PublicAttendee[];
  totalGuests: number;
  checkedInCount: number;
  dinnerCount: number;
  latestGuest: PublicAttendee | null;
  serviceMode: CheckInMode;
  joinUrl: string;
  updatedAt: string;
}

export interface CheckInResponse {
  status: CheckInStatus;
  attendee: PublicAttendee | null;
  message: string;
  serviceMode: CheckInMode;
  matches: number;
}

export interface LiveFeedEvent {
  type: "ready" | "check-in";
  attendee: PublicAttendee | null;
  emittedAt: string;
}
