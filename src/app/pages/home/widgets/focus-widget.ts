import { Component, computed, inject, signal } from '@angular/core';
import { BoardStore } from '../../../core/board.store';
import { LanguageService } from '../../../core/language.service';
import { TimeTracker } from '../../../core/time-tracker.service';
import { FOCUS_LENGTHS, type FocusLength } from '../../../data/focus';
import { clockText, entrySeconds } from '../../../data/format';
import { Rings, type Ring } from '../../../ui/rings/rings';
import { Widget } from '../../../ui/widget/widget';
import { HomeData } from '../home-data.service';

/**
 * Starts a focus run on a card, the next one due already picked so a single
 * tap is enough. It is the timer of the card itself with an
 * end, so the time shows up on the card and the focus pill counts it down.
 */
@Component({
  selector: 'app-focus-widget',
  imports: [Widget, Rings],
  templateUrl: './focus-widget.html',
  styleUrl: './focus.scss',
})
export class FocusWidget {
  private readonly tracker = inject(TimeTracker);
  private readonly store = inject(BoardStore);
  private readonly data = inject(HomeData);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = inject(LanguageService).dict;

  /** Whether this board measures time at all. */
  protected readonly enabled = this.tracker.enabled;

  /** The lengths on offer. */
  protected readonly lengths = FOCUS_LENGTHS;

  /** The length picked by hand, null until one is. */
  private readonly chosen = signal<FocusLength | null>(null);

  /** The length picked, else the board's default. */
  protected readonly length = computed(() => this.chosen() ?? this.tracker.defaultLength());

  /** The card picked by hand, empty until one is chosen. */
  private readonly picked = signal('');

  /** The card the run starts on: the one picked, else the next one due. */
  protected readonly taskId = computed(() => {
    const picked = this.open().some((task) => task.id === this.picked()) ? this.picked() : '';
    return picked || this.data.nextCard()?.id || this.open()[0]?.id || '';
  });

  /** The running timer, or null. */
  protected readonly running = this.tracker.running;

  /** True while a start or stop is on its way. */
  protected readonly busy = this.tracker.busy;

  /** Cards that are still open, to pick from. */
  protected readonly open = computed(() => {
    const last = this.store.columns().at(-1)?.id;
    return this.store.tasks().filter((task) => task.columnId !== last);
  });

  /** The big number: time left while running, the picked length otherwise. */
  protected readonly clock = computed(() => {
    const running = this.running();
    if (!running) {
      return clockText(this.length() * 60);
    }
    return clockText(this.tracker.left() ?? entrySeconds(running.entry, this.tracker.sinceRead()));
  });

  /** The single ring around the clock. */
  protected readonly ring = computed<Ring[]>(() => [
    { label: 'focus', value: this.running() ? this.tracker.share() : 0, color: 'var(--j0in-ring-focus)' },
  ]);

  /** Takes the length picked. */
  protected pickLength(minutes: FocusLength): void {
    this.chosen.set(minutes);
  }

  /** Takes the card chosen in the list. */
  protected pick(event: Event): void {
    this.picked.set((event.target as HTMLSelectElement).value);
  }

  /** Starts the run on the picked card. */
  protected start(): void {
    if (this.taskId() !== '') {
      this.tracker.startFocus(this.taskId(), this.length());
    }
  }

  /** Stops the running timer. */
  protected stop(): void {
    this.tracker.stop();
  }
}
