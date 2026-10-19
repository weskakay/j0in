import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { BoardStore } from '../../core/board.store';
import { CalendarService } from '../../core/calendar.service';
import { LanguageService } from '../../core/language.service';
import { shift, dateOf } from '../../data/board-filter';
import { entriesOn, monthCells, weekDays, type DayEntry } from '../../data/calendar-grid';
import { localeOf, today } from '../../data/format';

/** Month or week. */
export type CalendarView = 'month' | 'week';

/**
 * What the calendar page shows: the day it is anchored on, month or week,
 * and the entries of each day. Cards that come due are there for everyone;
 * events join once a Google calendar is connected.
 */
@Injectable()
export class CalendarData {
  private readonly store = inject(BoardStore);
  private readonly calendar = inject(CalendarService);
  private readonly auth = inject(AuthService);
  private readonly language = inject(LanguageService);

  /** Today, as the API writes dates. */
  readonly today = today();

  /** The day the view is anchored on. */
  readonly anchor = signal(this.today);

  /** Month or week. */
  readonly view = signal<CalendarView>('month');

  /** Whether events from Google join the cards. */
  readonly connected = computed(() => this.auth.canUseCalendar() && this.calendar.status().connected);

  /** The cells of the month the anchor lies in. */
  readonly cells = computed(() => {
    const date = dateOf(this.anchor());
    return monthCells(date.getFullYear(), date.getMonth());
  });

  /** The days of the anchor's week. */
  readonly week = computed(() => weekDays(this.anchor()));

  /** The cards still open, the only ones that show as due. */
  private readonly open = computed(() => {
    const last = this.store.columns().at(-1)?.id;
    return this.store.tasks().filter((task) => task.columnId !== last);
  });

  /** Entries per day of everything on screen. */
  private readonly byDay = computed(() => {
    const connected = this.connected();
    const map = new Map<string, DayEntry[]>();
    for (const day of this.days()) {
      map.set(day, entriesOn(day, this.open(), connected ? this.calendar.spanEvents() : [], this.store.categories()));
    }
    if (!map.has(this.today)) {
      const todays = connected ? this.calendar.todayEvents() : [];
      map.set(this.today, entriesOn(this.today, this.open(), todays, this.store.categories()));
    }
    return map;
  });

  /** The days on screen. */
  private readonly days = computed(() =>
    this.view() === 'month' ? this.cells().map((cell) => cell.day) : this.week(),
  );

  /** Fetches the span on screen whenever it changes. */
  private readonly loadSpan = effect(() => {
    const days = this.days();
    if (this.connected()) {
      this.calendar.loadSpan(days[0], days.at(-1) ?? days[0]);
    }
  });

  /** Fetches today once a calendar is connected. */
  private readonly loadToday = effect(() => {
    if (this.connected()) {
      this.calendar.loadToday();
    }
  });

  constructor() {
    this.store.load();
    if (this.auth.canUseCalendar()) {
      this.calendar.load();
    }
  }

  /** The entries of one day. */
  entries(day: string): DayEntry[] {
    return this.byDay().get(day) ?? [];
  }

  /** Steps a month or a week forward or back. */
  step(direction: 1 | -1): void {
    const date = dateOf(this.anchor());
    if (this.view() === 'week') {
      this.anchor.set(shift(date, 7 * direction));
      return;
    }
    const first = shift(new Date(date.getFullYear(), date.getMonth() + direction, 1), 0);
    this.anchor.set(first.slice(0, 7) === this.today.slice(0, 7) ? this.today : first);
  }

  /** The heading: month and year in the language on screen. */
  readonly heading = computed(() =>
    new Intl.DateTimeFormat(localeOf(this.language.lang()), { month: 'long', year: 'numeric' }).format(
      dateOf(this.anchor()),
    ),
  );

  /** A day written out, such as Sunday, 18 October. */
  label(day: string): string {
    const format = { weekday: 'long', day: 'numeric', month: 'long' } as const;
    return new Intl.DateTimeFormat(localeOf(this.language.lang()), format).format(dateOf(day));
  }

  /** Short weekday names, Monday first, taken from any week. */
  readonly weekdayNames = computed(() => {
    const names = new Intl.DateTimeFormat(localeOf(this.language.lang()), { weekday: 'short' });
    return weekDays(this.today).map((day) => names.format(dateOf(day)));
  });

  /** How many entries the anchor's week holds. */
  readonly weekCount = computed(() => this.week().reduce((sum, day) => sum + this.entries(day).length, 0));
}
