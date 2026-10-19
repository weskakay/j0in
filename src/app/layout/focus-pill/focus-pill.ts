import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BoardStore } from '../../core/board.store';
import { LanguageService } from '../../core/language.service';
import { TimeTracker } from '../../core/time-tracker.service';
import { ToastService } from '../../core/toast.service';
import { clockText, entrySeconds } from '../../data/format';

/** Circumference of the small progress ring, radius 9. */
const RING = 2 * Math.PI * 9;

/**
 * A black pill at the top of the screen. It shows the running timer from
 * every page, grows for a moment to show a short message, and opens on a
 * tap to stop the timer.
 */
@Component({
  selector: 'app-focus-pill',
  imports: [RouterLink],
  templateUrl: './focus-pill.html',
  styleUrl: './focus-pill.scss',
  host: { '[class.idle]': '!toast() && !running()', '(keydown.escape)': 'expanded.set(false)' },
})
export class FocusPill {
  private readonly tracker = inject(TimeTracker);
  private readonly store = inject(BoardStore);
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** The message on screen, or null. */
  protected readonly toast = inject(ToastService).current;

  /** The running timer, or null. */
  protected readonly running = this.tracker.running;

  /** Whether the pill is opened up to show the task and the stop button. */
  protected readonly expanded = signal(false);

  /** Whether the running timer has an end, which makes it a focus run. */
  protected readonly focus = computed(() => this.running()?.entry.target != null);

  /** Time left of a focus run, or time spent on an open-ended timer. */
  protected readonly clock = computed(() => {
    const running = this.running();
    if (!running) {
      return '';
    }
    const left = this.tracker.left();
    return clockText(left ?? entrySeconds(running.entry, this.tracker.sinceRead()));
  });

  /** The dash length that fills the ring as far as the run has come. */
  protected readonly dash = computed(() => `${this.tracker.share() * RING} ${RING}`);

  /** The title of the card the timer runs on. */
  protected readonly title = computed(() => {
    const id = this.running()?.taskId;
    return this.store.tasks().find((task) => task.id === id)?.title ?? '';
  });

  /** Folds the pill back once the timer is gone, so the next one starts small. */
  private readonly fold = effect(() => {
    if (!this.running()) {
      untracked(() => this.expanded.set(false));
    }
  });

  /** Opens or closes the pill. */
  protected toggle(): void {
    this.expanded.update((open) => !open);
  }

  /** Stops the timer and folds the pill back. */
  protected stop(): void {
    this.tracker.stop();
    this.expanded.set(false);
  }
}
