import { Component, computed, inject, signal } from '@angular/core';
import type { Observable } from 'rxjs';
import { BoardStore } from '../../core/board.store';
import { LanguageService } from '../../core/language.service';
import { ToastService } from '../../core/toast.service';
import { today } from '../../data/format';
import { categoryRows } from '../../data/home';
import type { Category, CategoryInput, ProjectStatus } from '../../data/models';
import { filterProjects, projectStats, type ProjectFilter } from '../../data/projects';
import { Dialog } from '../../layout/dialog/dialog';
import { Loader } from '../../layout/loader/loader';
import { ProjectCard } from './project-card/project-card';
import { ProjectForm } from './project-form/project-form';

/** The filters in the order the switch shows them. */
const FILTERS: ProjectFilter[] = ['all', 'active', 'planning', 'review', 'shipped'];

/**
 * Every project of the board as a card, with figures on top and a switch by
 * state. New and edited projects open in a dialog.
 */
@Component({
  selector: 'app-projects',
  imports: [ProjectCard, ProjectForm, Dialog, Loader],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
})
export class Projects {
  private readonly store = inject(BoardStore);
  private readonly toasts = inject(ToastService);

  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** True while a load is running. */
  protected readonly loading = this.store.loading;

  /** Whether a board has arrived at all. */
  protected readonly ready = this.store.ready;

  /** The filters on offer. */
  protected readonly filters = FILTERS;

  /** The filter picked. */
  protected readonly filter = signal<ProjectFilter>('all');

  /** The project in the dialog: null for a new one, undefined while it is closed. */
  protected readonly editing = signal<Category | null | undefined>(undefined);

  /** True while a save or delete is on its way. */
  protected readonly busy = signal(false);

  /** Why the last save or delete failed, shown in the dialog. */
  protected readonly problem = signal<string | null>(null);

  private readonly lastId = computed(() => this.store.columns().at(-1)?.id ?? null);

  /** The figures above the cards. */
  protected readonly stats = computed(() =>
    projectStats(this.store.categories(), this.store.tasks(), this.lastId(), today()),
  );

  /** The cards to show, with their figures. */
  protected readonly rows = computed(() => {
    const shown = filterProjects(this.store.categories(), this.filter());
    return categoryRows(this.store.tasks(), shown, this.lastId());
  });

  constructor() {
    this.store.load();
  }

  /** The words on a filter button. */
  protected label(filter: ProjectFilter): string {
    return filter === 'all' ? this.t().projects.all : this.t().projects.status[filter as ProjectStatus];
  }

  /** Pins a project or takes it off the sidebar. */
  protected togglePin(project: Category): void {
    this.store.pinCategory(project.id, !project.pinned).subscribe({
      error: (failure: Error) => this.toasts.show(this.language.message(failure.message)),
    });
  }

  /** Saves the dialog, as a new project or over the one being edited. */
  protected save(input: CategoryInput): void {
    const current = this.editing();
    const request = current ? this.store.updateCategory(current.id, input) : this.store.createCategory(input);
    this.run(request, current ? this.t().settings.savedCategory : this.t().settings.addedCategory);
  }

  /** Deletes the project in the dialog. */
  protected remove(): void {
    const current = this.editing();
    if (current) {
      this.run(this.store.deleteCategory(current.id), this.t().settings.removedCategory);
    }
  }

  /** Closes the dialog and forgets a failed attempt. */
  protected close(): void {
    this.editing.set(undefined);
    this.problem.set(null);
  }

  /** Keeps the dialog open and says why the change did not go through. */
  private fail(message: string): void {
    this.busy.set(false);
    this.problem.set(this.language.message(message));
  }

  /** Sends a change, closes the dialog when it went through and says so. */
  private run(request: Observable<unknown>, done: string): void {
    this.busy.set(true);
    this.problem.set(null);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.close();
        this.toasts.show(done);
      },
      error: (failure: Error) => this.fail(failure.message),
    });
  }
}
