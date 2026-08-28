import { Component, type OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Category, Column, Contact, SubtaskInput, Task, TaskInput } from '../../../data/models';
import { initialsOf } from '../../../data/format';

/** Collects everything a task needs, for creating as well as editing. */
@Component({
  selector: 'app-task-form',
  imports: [ReactiveFormsModule],
  templateUrl: './task-form.html',
  styleUrl: './task-form.scss',
})
export class TaskForm implements OnInit {
  private readonly fb = inject(FormBuilder);

  /** The task being edited, or null when a new one is created. */
  readonly task = input<Task | null>(null);

  /** The column a new task lands in. */
  readonly columnId = input.required<string>();

  /** Columns to choose from. */
  readonly columns = input<Column[]>([]);

  /** Categories to choose from. */
  readonly categories = input<Category[]>([]);

  /** Contacts that can be assigned. */
  readonly contacts = input<Contact[]>([]);

  /** True while the save request is running. */
  readonly saving = input(false);

  /** Fires with the collected values when the form is submitted. */
  readonly submitted = output<TaskInput>();

  /** Fires when the visitor abandons the form. */
  readonly cancelled = output<void>();

  /** The subtasks being edited, kept outside the form as a plain list. */
  protected readonly subtasks = signal<SubtaskInput[]>([]);

  /** Ids of the contacts currently assigned. */
  protected readonly picked = signal<string[]>([]);

  /** The fields the form validates. */
  protected readonly form = this.fb.nonNullable.group({
    columnId: ['', Validators.required],
    categoryId: [''],
    title: ['', [Validators.required, Validators.maxLength(120)]],
    description: [''],
    dueDate: ['', Validators.required],
    priority: ['medium', Validators.required],
  });

  /** Text of the button that saves, which differs between the two uses. */
  protected readonly saveLabel = computed(() => (this.task() ? 'Speichern' : 'Anlegen'));

  /** Inputs are only set after construction, so the form is filled here. */
  ngOnInit(): void {
    this.fillFromInputs();
  }

  /** Whether a contact is currently assigned. */
  protected isPicked(contactId: string): boolean {
    return this.picked().includes(contactId);
  }

  /** Letters on a contact's avatar. */
  protected initials(contact: Contact): string {
    return initialsOf(contact.name);
  }

  /** Adds or removes one contact from the assignment. */
  protected togglePicked(contactId: string): void {
    this.picked.update((ids) =>
      ids.includes(contactId) ? ids.filter((id) => id !== contactId) : [...ids, contactId],
    );
  }

  /** Appends an empty subtask for the visitor to name. */
  protected addSubtask(): void {
    this.subtasks.update((list) => [...list, { title: '', isDone: false }]);
  }

  /** Writes the typed title back into one subtask. */
  protected renameSubtask(index: number, event: Event): void {
    const title = (event.target as HTMLInputElement).value;
    this.subtasks.update((list) => list.map((s, i) => (i === index ? { ...s, title } : s)));
  }

  /** Drops one subtask from the list. */
  protected removeSubtask(index: number): void {
    this.subtasks.update((list) => list.filter((_, i) => i !== index));
  }

  /** Validates, then hands the collected values up to the board. */
  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.collect());
  }

  /** Turns the form and the two side lists into one payload. */
  private collect(): TaskInput {
    const value = this.form.getRawValue();
    return {
      columnId: value.columnId,
      categoryId: value.categoryId || null,
      title: value.title.trim(),
      description: value.description.trim() || null,
      dueDate: value.dueDate,
      priority: value.priority as TaskInput['priority'],
      contactIds: this.picked(),
      subtasks: this.subtasks().filter((s) => s.title.trim() !== ''),
    };
  }

  /** Starts the form off, either empty or from the task being edited. */
  private fillFromInputs(): void {
    const task = this.task();
    this.form.patchValue({
      columnId: task?.columnId ?? this.columnId(),
      categoryId: task?.categoryId ?? '',
      title: task?.title ?? '',
      description: task?.description ?? '',
      dueDate: task?.dueDate ?? '',
      priority: task?.priority ?? 'medium',
    });
    this.subtasks.set((task?.subtasks ?? []).map((s) => ({ title: s.title, isDone: s.isDone })));
    this.picked.set([...(task?.contactIds ?? [])]);
  }
}
