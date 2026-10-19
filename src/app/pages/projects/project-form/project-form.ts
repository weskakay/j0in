import { Component, type OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LanguageService } from '../../../core/language.service';
import { DEFAULT_SWATCH } from '../../../data/palette';
import { PROJECT_ICONS, PROJECT_ICON_NAMES } from '../../../data/project-icons';
import type { ProjectIconName } from '../../../data/i18n/pages';
import type { Category, CategoryInput, ProjectStatus } from '../../../data/models';
import { ColorPicker } from '../../../layout/color-picker/color-picker';

/** The states offered in the form, in their natural order. */
const STATES: ProjectStatus[] = ['planning', 'active', 'review', 'shipped'];

/** How far each arrow key moves through the icons. */
const ARROW_STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** Collects a project: name, colour, icon, line, state and date. */
@Component({
  selector: 'app-project-form',
  imports: [ReactiveFormsModule, ColorPicker],
  templateUrl: './project-form.html',
  styleUrl: './project-form.scss',
})
export class ProjectForm implements OnInit {
  private readonly fb = inject(FormBuilder);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = inject(LanguageService).dict;

  /** The project being edited, or null for a new one. */
  readonly project = input<Category | null>(null);

  /** True while the save is on its way. */
  readonly saving = input(false);

  /** Why the last save or delete failed, shown above the buttons. */
  readonly problem = input<string | null>(null);

  /** Fires with the collected values. */
  readonly submitted = output<CategoryInput>();

  /** Fires when the project should be deleted. */
  readonly removed = output<void>();

  /** Fires when the form is left without saving. */
  readonly cancelled = output<void>();

  /** The states on offer. */
  protected readonly states = STATES;

  /** The icons on offer with their drawings. */
  protected readonly icons = PROJECT_ICON_NAMES.map((name) => ({ name, path: PROJECT_ICONS[name] }));

  /** The colour picked, kept apart from the form like on the other forms. */
  protected readonly color = signal(DEFAULT_SWATCH);

  /** The icon picked. */
  protected readonly icon = signal<ProjectIconName | null>(null);

  /** True once delete was pressed, waiting for the second press. */
  protected readonly confirming = signal(false);

  /** The fields the form validates. */
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    description: ['', Validators.maxLength(300)],
    status: ['active' as ProjectStatus, Validators.required],
    dueDate: [''],
  });

  /** The words on the save button. */
  protected readonly saveLabel = computed(() => (this.project() ? this.t().projects.save : this.t().projects.add));

  /** Inputs are only set after construction, so the form is filled here. */
  ngOnInit(): void {
    const project = this.project();
    this.form.patchValue({
      name: project?.name ?? '',
      description: project?.description ?? '',
      status: project?.status ?? 'active',
      dueDate: project?.dueDate ?? '',
    });
    this.color.set(project?.color ?? DEFAULT_SWATCH);
    this.icon.set((project?.icon as ProjectIconName | null) ?? null);
  }

  /** Validates, then hands the values up. */
  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.collect());
  }

  /** The form and the two pickers as one payload. */
  private collect(): CategoryInput {
    const value = this.form.getRawValue();
    return {
      name: value.name.trim(),
      color: this.color(),
      icon: this.icon(),
      description: value.description.trim() || null,
      status: value.status,
      dueDate: value.dueDate || null,
    };
  }

  /** Asks once, deletes on the second press. */
  protected remove(): void {
    if (this.confirming()) {
      this.removed.emit();
      return;
    }
    this.confirming.set(true);
  }

  /** Arrow keys move the pick through the icons, as in any group of radios. */
  protected stepIcon(event: KeyboardEvent): void {
    const step = ARROW_STEPS[event.key];
    if (!step) {
      return;
    }
    event.preventDefault();
    const picked = this.icon();
    const at = picked ? PROJECT_ICON_NAMES.indexOf(picked) : step > 0 ? -1 : 0;
    const next = PROJECT_ICON_NAMES[(at + step + PROJECT_ICON_NAMES.length) % PROJECT_ICON_NAMES.length];
    this.icon.set(next);
    (event.currentTarget as HTMLElement).parentElement?.querySelector<HTMLElement>(`[data-icon="${next}"]`)?.focus();
  }
}
