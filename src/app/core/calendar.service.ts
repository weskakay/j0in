import { Injectable, inject, signal } from '@angular/core';
import { today } from '../data/format';
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

  /** The events of the span the calendar page shows, a week or a month. */
  readonly spanEvents = signal<DayEvent[]>([]);

  /** The events of today, whatever span is on screen. */
  readonly todayEvents = signal<DayEvent[]>([]);

  /** The span last asked for, so a change can read it again and late answers are dropped. */
  private span: [string, string] | null = null;

  /** Fetches the events from one day to another, at most six weeks. */
  loadSpan(from: string, to: string): void {
    const span: [string, string] = [from, to];
    this.span = span;
    const query = `date=${from}&to=${to}&tz=${encodeURIComponent(zone())}`;
    this.api.get<DayAnswer>(`/calendar/events?${query}`).subscribe({
      next: (answer) => this.takeSpan(span, answer.events),
      error: () => this.takeSpan(span, []),
    });
  }

  /** Keeps the events of a span, unless another span was asked for since. */
  private takeSpan(span: [string, string], events: DayEvent[]): void {
    if (this.span === span) {
      this.spanEvents.set(events);
    }
  }

  /** Fetches today on its own, so a list of today stays put while the span moves. */
  loadToday(): void {
    this.api.get<DayAnswer>(`/calendar/events?date=${today()}&tz=${encodeURIComponent(zone())}`).subscribe({
      next: (answer) => this.todayEvents.set(answer.events),
      error: () => this.todayEvents.set([]),
    });
  }

  /** Reads the last span and today again, after a card was planned. */
  reloadSpan(): void {
    if (this.span) {
      this.loadSpan(...this.span);
      this.loadToday();
    }
  }

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

/** The time zone this browser sits in, so the day is cut at the right hours. */
function zone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}
