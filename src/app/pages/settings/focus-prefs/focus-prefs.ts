import { Component, computed, inject, signal } from '@angular/core';
import { BoardStore } from '../../../core/board.store';
import { LanguageService } from '../../../core/language.service';
import { ToastService } from '../../../core/toast.service';
import { FOCUS_LENGTHS, type FocusLength } from '../../../data/focus';
import { hoursIn } from '../../../data/format';
import type { Preferences } from '../../../data/models';

/** How far one press moves the daily goal and the weekly capacity. */
const GOAL_STEP = 15;
const CAPACITY_STEP = 1;

/** The ranges the server accepts. */
const GOAL_RANGE: [number, number] = [15, 600];
const CAPACITY_RANGE: [number, number] = [1, 80];

/** The board's focus length, daily focus goal and weekly capacity per person. */
@Component({
  selector: 'app-focus-prefs',
  templateUrl: './focus-prefs.html',
  styleUrl: './focus-prefs.scss',
})
export class FocusPrefs {
  private readonly store = inject(BoardStore);
  private readonly toasts = inject(ToastService);
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** What was sent from here, shown at once so quick presses add up; it matches the board once answered. */
  private readonly sent = signal<Partial<Preferences>>({});

  /** The figures as the board holds them, with the presses not yet answered on top. */
  protected readonly prefs = computed(() => ({ ...this.store.preferences(), ...this.sent() }));

  /** The focus lengths on offer. */
  protected readonly lengths = FOCUS_LENGTHS;

  /** The daily goal in hours, written the way the language does. */
  protected readonly goal = computed(() => hoursIn(this.prefs().focusGoal * 60, this.language.lang(), 2));

  /** Picks the length a focus run starts with. */
  protected pickLength(minutes: FocusLength): void {
    this.save({ focusDefault: minutes });
  }

  /** Moves the daily goal by a quarter of an hour. */
  protected stepGoal(direction: 1 | -1): void {
    this.save({ focusGoal: clamp(this.prefs().focusGoal + direction * GOAL_STEP, GOAL_RANGE) });
  }

  /** Moves the weekly capacity by an hour. */
  protected stepCapacity(direction: 1 | -1): void {
    this.save({ weekCapacity: clamp(this.prefs().weekCapacity + direction * CAPACITY_STEP, CAPACITY_RANGE) });
  }

  /** Whether a step would leave the range. */
  protected atEdge(value: number, range: [number, number], direction: 1 | -1): boolean {
    return direction < 0 ? value <= range[0] : value >= range[1];
  }

  /** The ranges, for the template. */
  protected readonly ranges = { goal: GOAL_RANGE, capacity: CAPACITY_RANGE };

  /** Sends a change and says so once it went through. */
  private save(change: Partial<Preferences>): void {
    this.sent.update((before) => ({ ...before, ...change }));
    this.store.savePreferences(change).subscribe({
      next: () => this.toasts.show(this.t().prefs.saved),
      error: (failure: Error) => this.fail(failure.message),
    });
  }

  /** Drops what was shown early and reports why. */
  private fail(code: string): void {
    this.sent.set({});
    this.store.error.set(code);
  }
}

/** A value held inside its range. */
function clamp(value: number, [min, max]: [number, number]): number {
  return Math.min(max, Math.max(min, value));
}
