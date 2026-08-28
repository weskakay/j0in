import { Component, computed, input, output } from '@angular/core';
import type { Category, Contact, Task } from '../../../data/models';
import {
  assigneesOf,
  doneCount,
  donePercent,
  initialsOf,
  priorityLabel,
} from '../../../data/format';

/** A single card on the board. Opening it is handled by the board screen. */
@Component({
  selector: 'app-task-card',
  imports: [],
  templateUrl: './task-card.html',
  styleUrl: './task-card.scss',
})
export class TaskCard {
  /** The task this card shows. */
  readonly task = input.required<Task>();

  /** The task's category, or null when it has none. */
  readonly category = input<Category | null>(null);

  /** All contacts of the board, to resolve the assignees. */
  readonly contacts = input<Contact[]>([]);

  /** Fires when the card is activated by click or keyboard. */
  readonly open = output<Task>();

  /** The people this task is assigned to. */
  protected readonly assignees = computed(() => assigneesOf(this.task(), this.contacts()));

  /** How many subtasks are ticked off. */
  protected readonly done = computed(() => doneCount(this.task()));

  /** Share of finished subtasks, drives the width of the bar. */
  protected readonly percent = computed(() => donePercent(this.task()));

  /** German wording of the priority. */
  protected readonly priority = computed(() => priorityLabel(this.task().priority));

  /** Letters for one assignee's avatar. */
  protected initials(contact: Contact): string {
    return initialsOf(contact.name);
  }

  /** Passes the card on to the board screen. */
  protected activate(): void {
    this.open.emit(this.task());
  }
}
