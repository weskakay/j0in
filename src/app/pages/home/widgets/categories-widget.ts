import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BoardStore } from '../../../core/board.store';
import { LanguageService } from '../../../core/language.service';
import { initialsOf } from '../../../data/format';
import { categoryRows, type CategoryRow } from '../../../data/home';
import type { Contact } from '../../../data/models';
import { Widget } from '../../../ui/widget/widget';
import { ProjectIcon } from '../../../ui/project-icon/project-icon';
import { whenLabel } from '../due-label';
import { HomeData } from '../home-data.service';

/** How many avatars a row shows before it sums up the rest. */
const FACES = 3;

/**
 * Every category like a small project: how far it has come, what is still
 * open, the next date and the people working on it.
 */
@Component({
  selector: 'app-categories-widget',
  imports: [Widget, RouterLink, ProjectIcon],
  templateUrl: './categories-widget.html',
  styleUrl: './categories.scss',
})
export class CategoriesWidget {
  private readonly data = inject(HomeData);
  private readonly store = inject(BoardStore);
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** The categories with their figures. */
  protected readonly rows = computed(() =>
    categoryRows(this.store.tasks(), this.store.categories(), this.data.lastId()),
  );

  /** The first few people of a row. */
  protected facesOf(row: CategoryRow): Contact[] {
    return this.store.contacts().filter((one) => row.contactIds.includes(one.id)).slice(0, FACES);
  }

  /** How many people a row has beyond the faces shown. */
  protected moreOf(row: CategoryRow): number {
    return Math.max(0, row.contactIds.length - FACES);
  }

  /** Open cards and the next date, as the line under the name. */
  protected summary(row: CategoryRow): string {
    const words = this.t().home;
    const open = `${row.open} ${words.openShort}`;
    return row.nextDue ? `${open} · ${whenLabel(row.nextDue, this.data.day(), this.t(), this.language.lang())}` : open;
  }

  /** Letters on an avatar. */
  protected initials(contact: Contact): string {
    return initialsOf(contact.name);
  }
}
