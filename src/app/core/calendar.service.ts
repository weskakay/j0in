import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';

/** What the API says about the connection to Google. */
export interface CalendarStatus {
  available: boolean;
  connected: boolean;
  email: string | null;
  calendarId: string | null;
}

/** One entry of the day, as the planner draws it. */
export interface DayEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  taskId: string | null;
}

/** The answer of the events endpoint. */
interface DayAnswer {
  date: string;
  events: DayEvent[];
}

/** Nothing connected, and nothing known yet. */
const UNKNOWN: CalendarStatus = {
  available: false,
  connected: false,
  email: null,
  calendarId: null,
};

/**
 * Holds whether this account has a Google calendar attached. The consent
 * itself happens at Google, so connecting leaves the app and comes back.
 */
@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly api = inject(ApiService);

  /** What the server last said about the connection. */
  readonly status = signal<CalendarStatus>(UNKNOWN);

  /** True while a request is in flight. */
  readonly busy = signal(false);

  /** The day on screen, as YYYY-MM-DD. Shared, so the board knows it too. */
  readonly day = signal<string>(today());

  /** The events of the day currently on screen. */
  readonly events = signal<DayEvent[]>([]);

  /** True while the day is being fetched. */
  readonly loadingDay = signal(false);

  /** Set when the day could not be fetched. */
  readonly dayError = signal<string | null>(null);

  /** Moves to another day and fetches it. */
  showDay(date: string): void {
    this.day.set(date);
    this.loadDay(date);
  }

  /** Fetches the events of one day, given as YYYY-MM-DD. */
  loadDay(date: string): void {
    this.loadingDay.set(true);
    this.dayError.set(null);
    this.api.get<DayAnswer>(`/calendar/events?date=${date}&tz=${encodeURIComponent(zone())}`).subscribe({
      next: (answer) => this.acceptDay(answer.events),
      error: (failure: Error) => this.rejectDay(failure.message),
    });
  }

  /** Takes a fetched day. */
  private acceptDay(events: DayEvent[]): void {
    this.events.set(events);
    this.loadingDay.set(false);
  }

  /** Keeps the reason the day stayed empty. */
  private rejectDay(code: string): void {
    this.events.set([]);
    this.dayError.set(code);
    this.loadingDay.set(false);
  }

  /** Asks the server whether a calendar is attached. */
  load(): void {
    this.busy.set(true);
    this.api.get<CalendarStatus>('/calendar').subscribe({
      next: (status) => this.settle(status),
      error: () => this.settle(UNKNOWN),
    });
  }

  /**
   * Leaves for Google's consent screen. A full page change, not a request:
   * the answer comes back as a redirect to the settings.
   */
  connect(): void {
    location.href = '/api/calendar/connect';
  }

  /** Drops the connection and forgets the stored tokens. */
  disconnect(): void {
    this.busy.set(true);
    this.api.delete<{ ok: boolean }>('/calendar').subscribe({
      next: () => this.settle(UNKNOWN),
      error: () => this.busy.set(false),
    });
  }

  /** Takes an answer and ends the waiting state. */
  private settle(status: CalendarStatus): void {
    this.status.set(status);
    this.busy.set(false);
  }
}

/** Today, as YYYY-MM-DD in the local time zone. */
function today(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${`${now.getDate()}`.padStart(2, '0')}`;
}

/** The time zone this browser sits in, so the day is cut at the right hours. */
function zone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}
