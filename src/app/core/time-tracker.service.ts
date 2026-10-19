import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { type Observable, tap } from 'rxjs';
import type { Task, TimeEntry, TimeEntryInput } from '../data/models';
import { lastPhaseId, pickPhase, taskSeconds } from '../data/format';
import { focusLeft, focusLengthOf, focusShare, type FocusLength } from '../data/focus';
import { ApiService } from './api.service';
import { BoardStore } from './board.store';
import { LanguageService } from './language.service';
import { ToastService } from './toast.service';

/** How often a running timer is redrawn. */
const TICK = 1000;

/** The timer that runs on the board, and the card it runs on. */
export interface RunningTimer {
  taskId: string;
  entry: TimeEntry;
}

/**
 * Starts and stops the timer on the cards and books time by hand. The clock
 * itself lives on the server: a timer keeps running with the tab closed, and
 * only one runs per board.
 */
@Injectable({ providedIn: 'root' })
export class TimeTracker {
  private readonly api = inject(ApiService);
  private readonly store = inject(BoardStore);
  private readonly toasts = inject(ToastService);
  private readonly language = inject(LanguageService);
  private readonly now = signal(Date.now());
  private readonly chosen = signal<string | null>(null);
  /** The focus run already sent off as finished, so it is stopped only once. */
  private finished: string | null = null;

  /** True while a start or stop is on its way, so a double tap sends only one. */
  readonly busy = signal(false);

  /** Whether this board measures time at all. Switched in the settings. */
  readonly enabled = this.store.timeTracking;

  /** The timer running on this board, or null. */
  readonly running = computed<RunningTimer | null>(() => findRunning(this.store.tasks()));

  /** Whole seconds since the board was read, which a running entry adds on top. */
  readonly sinceRead = computed(() =>
    Math.max(0, Math.floor((this.now() - this.store.readAt()) / TICK)),
  );

  /** The phase the next start uses: picked last, else booked last, else the first. */
  readonly nextPhaseId = computed(() =>
    pickPhase(this.store.phases(), this.chosen(), lastPhaseId(this.store.tasks())),
  );

  /** The length a focus run starts with, as the board is set. */
  readonly defaultLength = computed(() => focusLengthOf(this.store.preferences().focusDefault));

  /** Seconds left of a running focus, or null when none runs or it is open-ended. */
  readonly left = computed(() => {
    const running = this.running();
    return running ? focusLeft(running.entry, this.sinceRead()) : null;
  });

  /** How far the running timer has come, between 0 and 1, for the rings. */
  readonly share = computed(() => {
    const running = this.running();
    return running ? focusShare(running.entry, this.sinceRead()) : 0;
  });

  /** Ends a focus run the moment its time is up, and says so. */
  private readonly finishing = effect(() => {
    const running = this.running();
    if (running && this.left() === 0 && running.entry.id !== this.finished) {
      this.finished = running.entry.id;
      this.send(this.api.delete(`/tasks/${running.taskId}/timer`));
      this.toasts.show(this.language.dict().pill.finished);
    }
  });

  /** Moves the clock on once a second, but only while a timer runs. */
  private readonly ticking = effect((onCleanup) => {
    if (!this.running()) {
      return;
    }
    this.now.set(Date.now());
    const handle = setInterval(() => this.now.set(Date.now()), TICK);
    onCleanup(() => clearInterval(handle));
  });

  /** Seconds booked on a task. Only a card with a running timer follows the clock. */
  secondsOn(task: Task): number {
    const live = task.timeEntries.some((entry) => entry.running);
    return taskSeconds(task, live ? this.sinceRead() : 0);
  }

  /** Whether the timer runs on this task. */
  runsOn(task: Task): boolean {
    return this.running()?.taskId === task.id;
  }

  /** Remembers the phase picked for the next start. */
  choose(phaseId: string | null): void {
    this.chosen.set(phaseId);
  }

  /** Starts or stops, whichever the task needs right now. */
  toggle(task: Task): void {
    if (this.runsOn(task)) {
      this.send(this.api.delete(`/tasks/${task.id}/timer`));
      return;
    }
    const phaseId = this.nextPhaseId();
    this.chosen.set(phaseId);
    this.send(this.api.post(`/tasks/${task.id}/timer`, { phaseId }));
  }

  /**
   * Starts a focus run of fixed length on a task. It is the same timer as on
   * the card, only with an end: the server stops it there even with the tab
   * closed, and the time lands on the card like any other entry.
   */
  startFocus(taskId: string, minutes: FocusLength): void {
    const phaseId = this.nextPhaseId();
    this.chosen.set(phaseId);
    const started = this.language.dict().pill.started;
    this.send(this.api.post(`/tasks/${taskId}/timer`, { phaseId, targetMinutes: minutes }), started);
  }

  /** Stops whatever runs on this board, used by the focus pill. */
  stop(): void {
    const running = this.running();
    if (running) {
      this.send(this.api.delete(`/tasks/${running.taskId}/timer`), this.language.dict().pill.stopped);
    }
  }

  /** Books time on a task by hand. */
  add(taskId: string, input: TimeEntryInput): Observable<unknown> {
    return this.api.post(`/tasks/${taskId}/time`, input).pipe(tap(() => this.store.refresh()));
  }

  /** Saves a changed entry. */
  update(entryId: string, input: TimeEntryInput): Observable<unknown> {
    return this.api.put(`/time/${entryId}`, input).pipe(tap(() => this.store.refresh()));
  }

  /** Deletes an entry. */
  remove(entryId: string): Observable<unknown> {
    return this.api.delete(`/time/${entryId}`).pipe(tap(() => this.store.refresh()));
  }

  /** Sends a start or stop, reads the board back and says so once it went through. */
  private send(request: Observable<unknown>, done?: string): void {
    this.busy.set(true);
    request.subscribe({
      next: () => {
        this.settle();
        if (done) {
          this.toasts.show(done);
        }
      },
      error: (failure: Error) => this.settle(failure),
    });
  }

  /** Frees the buttons again and either reloads or reports what went wrong. */
  private settle(failure?: Error): void {
    this.busy.set(false);
    if (failure) {
      this.store.error.set(failure.message);
      return;
    }
    this.store.refresh();
  }
}

/** The one running entry on the board, together with its card. */
function findRunning(tasks: Task[]): RunningTimer | null {
  for (const task of tasks) {
    const entry = task.timeEntries.find((one) => one.running);
    if (entry) {
      return { taskId: task.id, entry };
    }
  }
  return null;
}
