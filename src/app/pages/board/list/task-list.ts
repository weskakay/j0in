import { Component, computed, inject, input, output } from '@angular/core';
import { BoardStore, type ColumnWithTasks } from '../../../core/board.store';
import { LanguageService } from '../../../core/language.service';
import { assigneesOf, dateIn, initialsOf, today } from '../../../data/format';
import type { Category, Contact, Task } from '../../../data/models';

/**
 * The cards as a list, grouped by column. Ticking a card off moves it into
 * the last column; unticking it there brings it back to the first one.
 */
@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.html',
  styleUrl: './task-list.scss',
})
export class TaskList {
  private readonly store = inject(BoardStore);
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** The columns with the cards to show. */
  readonly board = input.required<ColumnWithTasks[]>();

  /** Fires when a card is opened. */
  readonly open = output<Task>();

  /** The column that means done. */
  protected readonly lastId = computed(() => this.store.columns().at(-1)?.id ?? '');

  /** Today, to mark the overdue dates. */
  protected readonly day = today();

  /** Whether a card sits in the last column. */
  protected isDone(task: Task): boolean {
    return task.columnId === this.lastId();
  }

  /** The category of a card, for the chip. */
  protected categoryOf(task: Task): Category | null {
    return this.store.categoryOf(task);
  }

  /** The people on a card. */
  protected peopleOf(task: Task): Contact[] {
    return assigneesOf(task, this.store.contacts());
  }

  /** Letters on an avatar. */
  protected initials(contact: Contact): string {
    return initialsOf(contact.name);
  }

  /** A due date written the way the language on screen writes it. */
  protected due(task: Task): string {
    return dateIn(task.dueDate, this.language.lang());
  }

  /** Moves a card into the last column, or out of it again to the first. */
  protected toggleDone(task: Task): void {
    const columns = this.store.columns();
    const target = this.isDone(task) ? columns[0] : columns.at(-1);
    if (!target) {
      return;
    }
    const position = this.store.tasks().filter((one) => one.columnId === target.id).length + 1;
    this.store.moveTask(task.id, target.id, position).subscribe({ next: () => this.store.load() });
  }
}
