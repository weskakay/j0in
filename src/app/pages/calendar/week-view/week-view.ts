import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BoardStore } from '../../../core/board.store';
import { CalendarService } from '../../../core/calendar.service';
import { LanguageService } from '../../../core/language.service';
import { ScheduleService } from '../../../core/schedule.service';
import { dateOf } from '../../../data/board-filter';
import { clockOf, type DayEntry } from '../../../data/calendar-grid';
import type { Task } from '../../../data/models';
import { CalendarData } from '../calendar-data.service';

/** The hours the week grid shows, from seven in the morning to ten at night. */
const FIRST_HOUR = 7;
const LAST_HOUR = 22;

/** Height of one hour in the grid, in pixels, matching the stylesheet. */
const HOUR = 48;

/**
 * A week as an hour grid. Events sit at their time, cards that come due on
 * top of their day. With a calendar connected, cards due this week can be
 * dragged into an hour to plan them.
 */
@Component({
  selector: 'app-week-view',
  imports: [RouterLink],
  templateUrl: './week-view.html',
  styleUrl: './week-view.scss',
})
export class WeekView {
  private readonly store = inject(BoardStore);
  private readonly calendar = inject(CalendarService);
  private readonly planned = inject(ScheduleService);

  /** The calendar on screen. */
  protected readonly data = inject(CalendarData);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = inject(LanguageService).dict;

  /** The hours down the side. */
  protected readonly hours = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, index) => FIRST_HOUR + index);

  /** Open cards due this week that no event has planned yet. */
  protected readonly unplanned = computed<Task[]>(() => {
    const week = this.data.week();
    const planned = new Set(this.calendar.spanEvents().map((event) => event.taskId));
    const last = this.store.columns().at(-1)?.id;
    return this.store
      .tasks()
      .filter((task) => task.columnId !== last && week.includes(task.dueDate ?? '') && !planned.has(task.id));
  });

  /** The entries of a day that have a time. */
  protected timed(day: string): DayEntry[] {
    return this.data.entries(day).filter((entry) => entry.start !== null);
  }

  /** The entries of a day without a time: cards due and all-day events. */
  protected allDay(day: string): DayEntry[] {
    return this.data.entries(day).filter((entry) => entry.start === null);
  }

  /** Where an entry starts in the grid, in pixels, kept inside the hours shown. */
  protected top(entry: DayEntry): number {
    return (inGrid(entry.start) - FIRST_HOUR * 60) * (HOUR / 60);
  }

  /** How tall the visible part of an entry is, at least half an hour. */
  protected height(entry: DayEntry): number {
    return Math.max(HOUR / 2, (inGrid(entry.end) - inGrid(entry.start)) * (HOUR / 60));
  }

  /** Start and end as clock times. */
  protected span(entry: DayEntry): string {
    return `${clockOf(entry.start ?? 0)} – ${clockOf(entry.end ?? 0)}`;
  }

  /** The day of the month. */
  protected dayNumber(day: string): number {
    return dateOf(day).getDate();
  }

  /** Remembers which card is being dragged. */
  protected onDragStart(event: DragEvent, task: Task): void {
    event.dataTransfer?.setData('text/plain', task.id);
  }

  /** Lets an hour accept a card. */
  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  /** Plans the dropped card at that hour of that day. */
  protected onDrop(event: DragEvent, day: string, hour: number): void {
    event.preventDefault();
    const taskId = event.dataTransfer?.getData('text/plain');
    if (taskId) {
      this.planned.schedule(taskId, hour * 60, day);
    }
  }
}

/** Minutes after midnight, held between the first hour and the last half hour of the grid. */
function inGrid(minutes: number | null): number {
  return Math.min(LAST_HOUR * 60 - 30, Math.max(FIRST_HOUR * 60, minutes ?? 0));
}
