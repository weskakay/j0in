import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { CalendarService } from './calendar.service';
import { BoardStore } from './board.store';
import { AuthService } from './auth.service';
import type { TaskInput } from '../data/models';

/** How long a card blocks when it is first laid into the day, in minutes. */
const DEFAULT_LENGTH = 60;

/**
 * Puts cards into the day and takes them out again. The event itself lives in
 * Google; this only asks the server to write it and then reloads the day, so
 * what is on screen is always what the calendar really holds.
 */
@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly api = inject(ApiService);
  private readonly calendar = inject(CalendarService);
  private readonly store = inject(BoardStore);
  private readonly auth = inject(AuthService);

  /**
   * Whether planning is on offer at all. It needs an account the server has
   * let through to the calendar, which the shared guest never is.
   */
  readonly possible = this.auth.canUseCalendar;

  /** Id of the card currently being written, so the day can show it. */
  readonly pending = signal<string | null>(null);

  /** Why the last attempt failed, worded by the caller. */
  readonly problem = signal<string | null>(null);

  /** Lays a card into the day at the given minute of day. */
  schedule(taskId: string, minutes: number, date: string): void {
    this.pending.set(taskId);
    this.problem.set(null);
    const body = { date, minutes, length: DEFAULT_LENGTH, timeZone: timeZone() };
    this.api.post<{ ok: boolean }>(`/tasks/${taskId}/schedule`, body).subscribe({
      next: () => this.done(date),
      error: (failure: Error) => this.failed(failure.message),
    });
  }

  /**
   * Writes a new card straight into the day. Everything the planner puts on
   * screen is a card, so a slot filled here shows up on the board as well.
   */
  createInDay(title: string, minutes: number, date: string): void {
    const columnId = this.store.columns()[0]?.id ?? '';
    if (columnId === '' || title.trim() === '') {
      return;
    }
    this.pending.set('new');
    this.problem.set(null);
    this.store.createTask(newCard(columnId, title.trim(), date)).subscribe({
      next: (made) => this.schedule(made.id, minutes, date),
      error: (failure: Error) => this.failed(failure.message),
    });
  }

  /** Takes a card back out of the day. */
  unschedule(taskId: string, date: string): void {
    this.pending.set(taskId);
    this.problem.set(null);
    this.api.delete<{ ok: boolean }>(`/tasks/${taskId}/schedule`).subscribe({
      next: () => this.done(date),
      error: (failure: Error) => this.failed(failure.message),
    });
  }

  /** Reloads the day, so the screen shows what Google now holds. */
  private done(date: string): void {
    this.pending.set(null);
    this.calendar.loadDay(date);
    this.calendar.reloadSpan();
  }

  /** Keeps the reason, so the day can say what went wrong. */
  private failed(code: string): void {
    this.pending.set(null);
    this.problem.set(code);
  }
}

/** A card as the planner creates it: a title, the day, nothing else. */
function newCard(columnId: string, title: string, date: string): TaskInput {
  return {
    columnId,
    categoryId: null,
    title,
    description: null,
    dueDate: date,
    priority: 'medium',
    contactIds: [],
    subtasks: [],
    estimateMinutes: null,
  };
}

/** The time zone this browser sits in, so the server does not have to guess. */
function timeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}
