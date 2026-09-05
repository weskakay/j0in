import { Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { CalendarService, type DayEvent } from '../../../core/calendar.service';
import { LanguageService } from '../../../core/language.service';
import { ScheduleService } from '../../../core/schedule.service';
import { BoardDrag } from '../drag/board-drag.service';

/** The first and last hour the day column draws. */
export const FIRST_HOUR = 6;
const LAST_HOUR = 22;

/** How tall one hour is drawn, in pixels. */
export const HOUR_HEIGHT = 56;

/** An event with the place it takes in the column. */
interface PlacedEvent {
  event: DayEvent;
  top: number;
  height: number;
  label: string;
}

/**
 * The day beside the board: the hours of the day with the events that already
 * sit in them. Reading only for now, so nothing here writes to the calendar.
 */
@Component({
  selector: 'app-planner',
  imports: [],
  templateUrl: './planner.html',
  styleUrl: './planner.scss',
})
export class Planner {
  private readonly calendar = inject(CalendarService);
  private readonly language = inject(LanguageService);
  private readonly planned = inject(ScheduleService);
  private readonly drag = inject(BoardDrag);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** The day on screen, as YYYY-MM-DD. Shared with the board. */
  protected readonly day = this.calendar.day;

  /** True while the day is being fetched. */
  protected readonly loading = this.calendar.loadingDay;

  /** The hours the column is divided into. */
  protected readonly hours = hourRange();

  /** How tall one hour is, so the template can place things. */
  protected readonly hourHeight = HOUR_HEIGHT;

  /** The events that carry a time, placed in the column. */
  protected readonly placed = computed<PlacedEvent[]>(() =>
    this.calendar
      .events()
      .filter((event) => !event.allDay)
      .map((event) => place(event)),
  );

  /** The events that cover the whole day; they sit above the hours. */
  protected readonly allDay = computed(() => this.calendar.events().filter((e) => e.allDay));

  /**
   * What went wrong, worded for the reader. Covers both fetching the day and
   * writing a card into it: a failed write must never pass unnoticed.
   */
  protected readonly problem = computed(() =>
    this.language.message(this.calendar.dayError() ?? this.planned.problem()),
  );

  /** The card currently being written into the calendar. */
  protected readonly pending = this.planned.pending;

  /** The first hour drawn, so the grid can report it to the drag. */
  protected readonly firstHour = FIRST_HOUR;

  /** Where a card would land, in pixels from the top, or null. */
  protected readonly aim = computed(() => {
    const minutes = this.drag.overSlot();
    return minutes === null ? null : topFor(minutes);
  });

  constructor() {
    this.calendar.loadDay(this.day());
    effect(() => this.field()?.nativeElement.focus());
  }

  /** Steps one day forward or back. */
  protected step(days: number): void {
    const moved = new Date(`${this.day()}T12:00:00`);
    moved.setDate(moved.getDate() + days);
    this.calendar.showDay(stamp(moved));
  }

  /** Jumps back to today. */
  protected goToday(): void {
    this.calendar.showDay(today());
  }

  /** Takes a card back out of the day. */
  protected release(taskId: string): void {
    this.planned.unschedule(taskId, this.day());
  }

  /** The minute a new card is being written for, or null when none is. */
  protected readonly composing = signal<number | null>(null);

  /** Where the input sits, in pixels from the top of the grid. */
  protected readonly composingTop = computed(() => topFor(this.composing() ?? FIRST_HOUR * 60));

  /** The input for a new card, once it is on screen. */
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  /**
   * Opens the input on the quarter hour that was hit. A click carries the
   * exact spot; the keyboard has none, so it starts the hour it is on.
   */
  protected compose(event: MouseEvent, hour: number): void {
    const row = event.currentTarget as HTMLElement;
    const inside = event.detail === 0 ? 0 : event.clientY - row.getBoundingClientRect().top;
    const raw = hour * 60 + (inside / HOUR_HEIGHT) * 60;
    this.composing.set(Math.max(0, Math.round(raw / 15) * 15));
  }

  /** Writes the typed title into the day as a new card. */
  protected keep(title: string): void {
    const minutes = this.composing();
    if (minutes !== null && title.trim() !== '') {
      this.planned.createInDay(title, minutes, this.day());
    }
    this.composing.set(null);
  }

  /** Closes the input without writing anything. */
  protected drop(): void {
    this.composing.set(null);
  }

  /** The clicked time, so the input can say what it is about to fill. */
  protected readonly composingLabel = computed(() => {
    const minutes = this.composing();
    return minutes === null ? '' : hhmm(minutes);
  });

  /** The day as the reader sees it in the heading. */
  protected readonly heading = computed(() =>
    new Date(`${this.day()}T12:00:00`).toLocaleDateString(this.language.lang(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
  );
}

/** Today, as YYYY-MM-DD in the local time zone. */
function today(): string {
  return stamp(new Date());
}

/** A date as YYYY-MM-DD, without slipping a day through the time zone. */
function stamp(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${`${date.getDate()}`.padStart(2, '0')}`;
}

/** The hours the column shows, as numbers. */
function hourRange(): number[] {
  return Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i);
}

/** Works out where an event sits in the column and how tall it is. */
function place(event: DayEvent): PlacedEvent {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const from = minutesFromFirst(start);
  const to = minutesFromFirst(end);
  return {
    event,
    top: (from / 60) * HOUR_HEIGHT,
    height: Math.max(((to - from) / 60) * HOUR_HEIGHT, 22),
    label: `${clock(start)} - ${clock(end)}`,
  };
}

/** Minutes between the first drawn hour and a moment. */
function minutesFromFirst(when: Date): number {
  return (when.getHours() - FIRST_HOUR) * 60 + when.getMinutes();
}

/**
 * How far a minute of day sits from the top of the grid, in pixels. Both the
 * input and the drop marker measure with this, so they cannot drift apart.
 */
export function topFor(minutes: number): number {
  return ((minutes - FIRST_HOUR * 60) / 60) * HOUR_HEIGHT;
}

/** Minutes since midnight as hours and minutes. */
function hhmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  return `${`${h}`.padStart(2, '0')}:${`${minutes % 60}`.padStart(2, '0')}`;
}

/** A moment as hours and minutes. */
function clock(when: Date): string {
  return `${`${when.getHours()}`.padStart(2, '0')}:${`${when.getMinutes()}`.padStart(2, '0')}`;
}
