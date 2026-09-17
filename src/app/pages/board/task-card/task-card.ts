import { Component, computed, inject, input, output } from '@angular/core';
import type { Category, Contact, Task } from '../../../data/models';
import {
  assigneesOf,
  clockText,
  doneCount,
  donePercent,
  durationText,
  initialsOf,
} from '../../../data/format';
import { LanguageService } from '../../../core/language.service';
import { TimeTracker } from '../../../core/time-tracker.service';

/** A single card on the board. Opening it is handled by the board screen. */
@Component({
  selector: 'app-task-card',
  imports: [],
  templateUrl: './task-card.html',
  styleUrl: './task-card.scss',
})
export class TaskCard {
  private readonly language = inject(LanguageService);
  private readonly tracker = inject(TimeTracker);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** True while a start or stop is on its way. */
  protected readonly busy = this.tracker.busy;

  /** Whether this board measures time at all. */
  protected readonly tracking = this.tracker.enabled;

  /** The task this card shows. */
  readonly task = input.required<Task>();

  /** The task's category, or null when it has none. */
  readonly category = input<Category | null>(null);

  /** All contacts of the board, to resolve the assignees. */
  readonly contacts = input<Contact[]>([]);

  /**
   * True for the copy that hangs on the pointer while dragging. It carries no
   * grip and takes no focus, so it stays a picture of the card and not a
   * second one you could operate.
   */
  readonly preview = input(false);

  /** Fires when the card is activated by click or keyboard. */
  readonly open = output<Task>();

  /** Fires on every key pressed while the card has focus. */
  readonly keyed = output<KeyboardEvent>();

  /** The people this task is assigned to. */
  protected readonly assignees = computed(() => assigneesOf(this.task(), this.contacts()));

  /** How many subtasks are ticked off. */
  protected readonly done = computed(() => doneCount(this.task()));

  /** Share of finished subtasks, drives the width of the bar. */
  protected readonly percent = computed(() => donePercent(this.task()));

  /** The priority in the language currently on screen. */
  protected readonly priority = computed(() => this.t().task[this.task().priority]);

  /** Whether the timer runs on this card. */
  protected readonly running = computed(() => this.tracker.runsOn(this.task()));

  /** Seconds booked on this card, the running timer included. */
  protected readonly seconds = computed(() => this.tracker.secondsOn(this.task()));

  /** A ticking clock while the timer runs, the plain total otherwise. */
  protected readonly timeLabel = computed(() =>
    this.running() ? clockText(this.seconds()) : durationText(this.seconds()),
  );

  /** Letters for one assignee's avatar. */
  protected initials(contact: Contact): string {
    return initialsOf(contact.name);
  }

  /** Starts the timer on this card, or stops it. */
  protected toggleTimer(): void {
    this.tracker.toggle(this.task());
  }

  /** Passes the card on to the board screen. */
  protected activate(): void {
    this.open.emit(this.task());
  }
}
