import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { BoardStore } from '../../core/board.store';
import { CalendarService, type DayEvent } from '../../core/calendar.service';
import { TimeTracker } from '../../core/time-tracker.service';
import { shift } from '../../data/board-filter';
import { doneOn, dueNext, dueOn, mineFor, overdue, secondsOn } from '../../data/home';

/** The focus a day aims for, in seconds: two hours. */
export const FOCUS_GOAL = 2 * 60 * 60;

/**
 * The figures of the home screen, worked out once and shared by the widgets.
 * Everything comes from the board in memory; the calendar adds the day's
 * events when it is connected.
 */
@Injectable()
export class HomeData {
  private readonly store = inject(BoardStore);
  private readonly tracker = inject(TimeTracker);
  private readonly calendar = inject(CalendarService);
  private readonly auth = inject(AuthService);
  private readonly clock = signal(Date.now());

  /** Today, as the API writes dates; moves on at midnight with the clock. */
  readonly day = computed(() => shift(new Date(this.clock()), 0));

  /** The column that means done, or null on an empty board. */
  readonly lastId = computed(() => this.store.columns().at(-1)?.id ?? null);

  /** Cards finished today. */
  readonly doneToday = computed(() => doneOn(this.store.tasks(), this.day(), this.lastId()));

  /** Open cards due today. */
  readonly dueToday = computed(() => dueOn(this.store.tasks(), this.day(), this.lastId()));

  /** Open cards past their date. */
  readonly overdue = computed(() => overdue(this.store.tasks(), this.day(), this.lastId()));

  /** Overdue and due today, the oldest first. */
  readonly mine = computed(() => mineFor(this.store.tasks(), this.day(), this.lastId()));

  /** The next open card to come due, overdue ones first. */
  readonly nextCard = computed(
    () => this.mine()[0] ?? dueNext(this.store.tasks(), this.day(), this.lastId(), 1)[0] ?? null,
  );

  /** Seconds booked today, the running timer included. */
  readonly focusSeconds = computed(() => secondsOn(this.store.tasks(), this.day(), this.tracker.sinceRead()));

  /** Whether the day's events can be shown at all. */
  readonly withCalendar = computed(() => this.auth.canUseCalendar() && this.calendar.status().connected);

  /** Today's events with a time, in order. */
  readonly events = computed<DayEvent[]>(() =>
    this.withCalendar() && this.calendar.day() === this.day()
      ? this.calendar.events().filter((event) => !event.allDay)
      : [],
  );

  /** Events that have not ended yet. */
  readonly upcoming = computed(() => this.events().filter((event) => Date.parse(event.end) > this.clock()));

  /** Fetches the day once the calendar turns out to be connected. */
  private readonly loadDay = effect(() => {
    if (this.withCalendar()) {
      this.calendar.showDay(this.day());
    }
  });

  constructor() {
    this.store.load();
    if (this.auth.canUseCalendar()) {
      this.calendar.load();
    }
    const ticking = setInterval(() => this.clock.set(Date.now()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(ticking));
  }

  /** The current time, moved on once a minute. */
  now(): number {
    return this.clock();
  }
}
