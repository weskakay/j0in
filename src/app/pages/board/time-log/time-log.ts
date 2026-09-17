import { Component, computed, inject, input, signal } from '@angular/core';
import type { Observable } from 'rxjs';
import type { Task, TimeEntry, TimeEntryInput, TimePhase } from '../../../data/models';
import { clockText, durationText, entrySeconds, secondsByPhase } from '../../../data/format';
import { BoardStore } from '../../../core/board.store';
import { LanguageService } from '../../../core/language.service';
import { TimeTracker } from '../../../core/time-tracker.service';
import { TimeEntryForm } from '../time-entry-form/time-entry-form';

/** One line of the summary: a phase and how long went into it. */
interface PhaseSum {
  id: string;
  name: string;
  text: string;
}

/** One booked entry, worded for the list. */
interface EntryRow {
  entry: TimeEntry;
  phase: string;
  duration: string;
}

/** The time section of a card: totals per phase, the timer and every entry. */
@Component({
  selector: 'app-time-log',
  imports: [TimeEntryForm],
  templateUrl: './time-log.html',
  styleUrl: './time-log.scss',
})
export class TimeLog {
  private readonly language = inject(LanguageService);
  private readonly store = inject(BoardStore);
  private readonly tracker = inject(TimeTracker);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** The task whose time is shown. */
  readonly task = input.required<Task>();

  /** The phases of the board. */
  protected readonly phases = this.store.phases;

  /** True while a start or stop is on its way. */
  protected readonly toggling = this.tracker.busy;

  /** The phase the next start uses. */
  protected readonly nextPhase = this.tracker.nextPhaseId;

  /** Which form is open: the id of an entry, "new", or nothing. */
  protected readonly editing = signal<string>('');

  /** True while a form save or a delete is on its way. */
  protected readonly saving = signal(false);

  /** Whether the timer runs on this task. */
  protected readonly running = computed(() => this.tracker.runsOn(this.task()));

  /** Everything booked on the task, worded. */
  protected readonly total = computed(() => {
    const seconds = this.tracker.secondsOn(this.task());
    return this.running() ? clockText(seconds) : durationText(seconds);
  });

  /** How long went into each phase, in the board's phase order. */
  protected readonly sums = computed<PhaseSum[]>(() =>
    phaseSums(secondsByPhase(this.task(), this.tracker.sinceRead()), this.phases(), this.t().time.noPhase),
  );

  /** The entries, a running one on top, then the one finished last. */
  protected readonly rows = computed<EntryRow[]>(() =>
    [...this.task().timeEntries].reverse().map((entry) => this.rowFor(entry)),
  );

  /** Remembers the phase picked for the next start. */
  protected onPhase(event: Event): void {
    this.tracker.choose((event.target as HTMLSelectElement).value || null);
  }

  /** Starts or stops the timer on this task. */
  protected toggle(): void {
    this.tracker.toggle(this.task());
  }

  /** Opens the form for booking time by hand, or for one entry. */
  protected open(id: string): void {
    this.editing.set(id);
  }

  /** Closes the open form. */
  protected close(): void {
    this.editing.set('');
  }

  /** Saves the open form, as a new entry or over an existing one. */
  protected save(input: TimeEntryInput): void {
    const id = this.editing();
    const request = id === 'new' ? this.tracker.add(this.task().id, input) : this.tracker.update(id, input);
    this.run(request, () => this.close());
  }

  /** Deletes one entry. */
  protected remove(entry: TimeEntry): void {
    this.run(this.tracker.remove(entry.id));
  }

  /** Runs a write, keeps the buttons blocked meanwhile and reports failures. */
  private run(request: Observable<unknown>, done?: () => void): void {
    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        done?.();
      },
      error: (failure: Error) => {
        this.saving.set(false);
        this.store.error.set(failure.message);
      },
    });
  }

  /** Words one entry for the list. */
  private rowFor(entry: TimeEntry): EntryRow {
    const seconds = entrySeconds(entry, this.tracker.sinceRead());
    return {
      entry,
      phase: this.phases().find((one) => one.id === entry.phaseId)?.name ?? this.t().time.noPhase,
      duration: entry.running ? clockText(seconds) : durationText(seconds),
    };
  }
}

/** Turns the seconds per phase id into worded lines, leaving out empty phases. */
function phaseSums(seconds: Record<string, number>, phases: TimePhase[], noPhase: string): PhaseSum[] {
  const named = phases
    .filter((phase) => (seconds[phase.id] ?? 0) > 0)
    .map((phase) => ({ id: phase.id, name: phase.name, text: durationText(seconds[phase.id]) }));
  const orphaned = Object.entries(seconds)
    .filter(([id]) => !phases.some((phase) => phase.id === id))
    .reduce((sum, [, value]) => sum + value, 0);
  return orphaned > 0 ? [...named, { id: '', name: noPhase, text: durationText(orphaned) }] : named;
}
