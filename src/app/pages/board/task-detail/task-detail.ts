import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Category, Column, Contact, Subtask, Task } from '../../../data/models';
import { assigneesOf, dateIn, doneCount, durationText, initialsOf, today } from '../../../data/format';
import { DEFAULT_FOCUS } from '../../../data/focus';
import { LanguageService } from '../../../core/language.service';
import { TimeTracker } from '../../../core/time-tracker.service';
import { TimeLog } from '../time-log/time-log';

/** What one subtask tick reports back to the board. */
export interface SubtaskToggle {
  subtaskId: string;
  isDone: boolean;
}

/**
 * A task read out in full, as the panel beside the board shows it: which
 * column it sits in, the key facts as tiles, its subtasks with a field for
 * one more, and the time booked on it.
 */
@Component({
  selector: 'app-task-detail',
  imports: [TimeLog, RouterLink],
  templateUrl: './task-detail.html',
  styleUrl: './task-detail.scss',
})
export class TaskDetail {
  private readonly language = inject(LanguageService);
  private readonly tracker = inject(TimeTracker);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** Whether this board measures time at all. */
  protected readonly tracking = this.tracker.enabled;

  /** The task being read. */
  readonly task = input.required<Task>();

  /** Its category, or null when it has none. */
  readonly category = input<Category | null>(null);

  /** All contacts of the board, to resolve the assignees. */
  readonly contacts = input<Contact[]>([]);

  /** The columns the task can be moved between. */
  readonly columns = input<Column[]>([]);

  /** Fires when a subtask is ticked or unticked. */
  readonly toggled = output<SubtaskToggle>();

  /** Fires with the column the task should move to. */
  readonly moved = output<string>();

  /** Fires with the title of a subtask to add. */
  readonly subtaskAdded = output<string>();

  /** Fires when the visitor wants to edit this task. */
  readonly edit = output<void>();

  /** Fires when the visitor wants to delete this task. */
  readonly remove = output<void>();

  /** The people this task is assigned to. */
  protected readonly assignees = computed(() => assigneesOf(this.task(), this.contacts()));

  /** The names of the people, readable without hovering an avatar. */
  protected readonly names = computed(() => this.assignees().map((person) => person.name).join(', '));

  /** The priority in the language currently on screen. */
  protected readonly priority = computed(() => this.t().task[this.task().priority]);

  /** The due date as the language on screen writes it. */
  protected readonly due = computed(() => dateIn(this.task().dueDate, this.language.lang()));

  /** Whether the due date has passed while the task is still open. */
  protected readonly late = computed(() => {
    const task = this.task();
    return !!task.dueDate && task.dueDate < today() && task.columnId !== this.columns().at(-1)?.id;
  });

  /** The estimate in hours and minutes, or empty for none. */
  protected readonly estimate = computed(() => {
    const minutes = this.task().estimateMinutes;
    return minutes === null ? '' : durationText(minutes * 60);
  });

  /** Ticked subtasks out of all, such as 2/3. */
  protected readonly progress = computed(() => `${doneCount(this.task())}/${this.task().subtasks.length}`);

  /** Whether the timer runs on this task right now. */
  protected readonly running = computed(() => this.tracker.runsOn(this.task()));

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

  /** Hands a typed subtask up and empties the field again. */
  protected addSubtask(field: HTMLInputElement): void {
    const title = field.value.trim();
    if (title !== '') {
      this.subtaskAdded.emit(title);
      field.value = '';
    }
  }

  /** Starts a focus run of the standard length on this task. */
  protected startFocus(): void {
    this.tracker.startFocus(this.task().id, DEFAULT_FOCUS);
  }
}
