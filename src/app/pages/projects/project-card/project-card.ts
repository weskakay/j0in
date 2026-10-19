import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BoardStore } from '../../../core/board.store';
import { LanguageService } from '../../../core/language.service';
import { dateIn, initialsOf, today } from '../../../data/format';
import type { CategoryRow } from '../../../data/home';
import type { Category, Contact } from '../../../data/models';
import { milestoneOf } from '../../../data/projects';
import { ProjectIcon } from '../../../ui/project-icon/project-icon';
import { Rings, type Ring } from '../../../ui/rings/rings';
import { SheenDirective } from '../../../ui/sheen.directive';
import { whenLabel } from '../../home/due-label';

/** How many faces a card shows before it sums up the rest. */
const FACES = 4;

/**
 * One project as a card: what it is, how far it has come, the next step and
 * the people on it. The name leads to the board narrowed to the project.
 */
@Component({
  selector: 'app-project-card',
  imports: [RouterLink, ProjectIcon, Rings],
  hostDirectives: [SheenDirective],
  templateUrl: './project-card.html',
  styleUrl: './project-card.scss',
  host: { '[style.--tile]': 'row().category.color' },
})
export class ProjectCard {
  private readonly store = inject(BoardStore);
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** The project with its figures. */
  readonly row = input.required<CategoryRow>();

  /** Fires when the star is pressed. */
  readonly pinned = output<Category>();

  /** Fires when the project is to be edited. */
  readonly edit = output<Category>();

  /** The project itself. */
  protected readonly project = computed(() => this.row().category);

  /** The open card that comes due first, or null. */
  protected readonly milestone = computed(() =>
    milestoneOf(this.project(), this.store.tasks(), this.store.columns().at(-1)?.id ?? null),
  );

  /** How far the project has come, as one ring in its colour. */
  protected readonly ring = computed<Ring[]>(() => [
    { label: 'done', value: this.row().percent / 100, color: this.project().color },
  ]);

  /** The first few people on it. */
  protected readonly faces = computed(() =>
    this.store.contacts().filter((one) => this.row().contactIds.includes(one.id)).slice(0, FACES),
  );

  /** How many people go beyond the faces shown. */
  protected readonly more = computed(() => Math.max(0, this.row().contactIds.length - FACES));

  /** How far off a date is, the way people say it. */
  protected when(date: string | null): string {
    return date ? whenLabel(date, today(), this.t(), this.language.lang()) : '';
  }

  /** The project's own date, written out. */
  protected readonly due = computed(() => dateIn(this.project().dueDate, this.language.lang()));

  /** Letters on an avatar. */
  protected initials(contact: Contact): string {
    return initialsOf(contact.name);
  }
}
