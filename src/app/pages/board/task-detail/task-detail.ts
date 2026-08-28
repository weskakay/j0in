import { Component, computed, input, output } from '@angular/core';
import type { Category, Contact, Subtask, Task } from '../../../data/models';
import { assigneesOf, germanDate, initialsOf, priorityLabel } from '../../../data/format';

/** What one subtask tick reports back to the board. */
export interface SubtaskToggle {
  subtaskId: string;
  isDone: boolean;
}

/** Reads a task out in full and lets its subtasks be ticked off. */
@Component({
  selector: 'app-task-detail',
  imports: [],
  templateUrl: './task-detail.html',
  styleUrl: './task-detail.scss',
})
export class TaskDetail {
  /** The task being read. */
  readonly task = input.required<Task>();

  /** Its category, or null when it has none. */
  readonly category = input<Category | null>(null);

  /** All contacts of the board, to resolve the assignees. */
  readonly contacts = input<Contact[]>([]);

  /** Fires when a subtask is ticked or unticked. */
  readonly toggled = output<SubtaskToggle>();

  /** Fires when the visitor wants to edit this task. */
  readonly edit = output<void>();

  /** Fires when the visitor wants to delete this task. */
  readonly remove = output<void>();

  /** The people this task is assigned to. */
  protected readonly assignees = computed(() => assigneesOf(this.task(), this.contacts()));

  /** German wording of the priority. */
  protected readonly priority = computed(() => priorityLabel(this.task().priority));

  /** The due date in German notation. */
  protected readonly due = computed(() => germanDate(this.task().dueDate));

  /** Letters for one assignee's avatar. */
  protected initials(contact: Contact): string {
    return initialsOf(contact.name);
  }

  /** Reports a ticked or unticked subtask. */
  protected onToggle(subtask: Subtask, event: Event): void {
    this.toggled.emit({
      subtaskId: subtask.id,
      isDone: (event.target as HTMLInputElement).checked,
    });
  }
}
