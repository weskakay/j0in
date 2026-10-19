import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BoardStore } from '../../../core/board.store';
import type { DayEvent } from '../../../core/calendar.service';
import { LanguageService } from '../../../core/language.service';
import { assigneesOf, initialsOf, localeOf } from '../../../data/format';
import { daysUntil, dueNext } from '../../../data/home';
import type { Contact, Task } from '../../../data/models';
import { Widget } from '../../../ui/widget/widget';
import { dueLabel } from '../due-label';
import { HomeData } from '../home-data.service';

/** How many entries the widget lists below the first one. */
const MORE = 3;

/**
 * What comes next, the first entry set apart in a card of its own: the next
 * event with a countdown when the calendar is connected, otherwise the next
 * card that comes due.
 */
@Component({
  selector: 'app-next-widget',
  imports: [Widget, RouterLink],
  templateUrl: './next-widget.html',
  styleUrl: './next.scss',
})
export class NextWidget {
  private readonly data = inject(HomeData);
  private readonly store = inject(BoardStore);
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** Whether events are shown rather than cards. */
  protected readonly withCalendar = this.data.withCalendar;

  /** The next event, or null. */
  protected readonly next = computed(() => this.data.upcoming()[0] ?? null);

  /** The events after the next one. */
  protected readonly later = computed(() => this.data.upcoming().slice(1, 1 + MORE));

  /** The cards due next, overdue ones first, for a board without a calendar. */
  protected readonly cards = computed(() => {
    const ahead = dueNext(this.store.tasks(), this.data.day(), this.data.lastId(), MORE + 1);
    const late = this.data.overdue().filter((task) => !ahead.includes(task));
    return [...late, ...ahead].slice(0, MORE + 1);
  });

  /** "in 14 min", or "now" once it has begun. */
  protected readonly countdown = computed(() => {
    const event = this.next();
    if (!event) {
      return '';
    }
    const minutes = Math.round((Date.parse(event.start) - this.data.now()) / 60_000);
    return minutes <= 0 ? this.t().home.now : `${this.t().home.inPrefix} ${minutes} ${this.t().home.minutes}`;
  });

  /** Start and end of an event as clock times. */
  protected span(event: DayEvent): string {
    return `${this.time(event.start)} – ${this.time(event.end)}`;
  }

  /** One clock time in the language on screen. */
  protected time(stamp: string): string {
    return new Intl.DateTimeFormat(localeOf(this.language.lang()), { hour: '2-digit', minute: '2-digit' }).format(new Date(stamp));
  }

  /** How far off a card's date is. */
  protected due(task: Task): string {
    return dueLabel(task, this.data.day(), this.t(), this.language.lang());
  }

  /** Whether a card is past its date. */
  protected isLate(task: Task): boolean {
    return !!task.dueDate && daysUntil(task.dueDate, this.data.day()) < 0;
  }

  /** The colour of a card's category, or the accent without one. */
  protected colorOf(task: Task): string {
    return this.store.categoryOf(task)?.color ?? 'var(--j0in-accent)';
  }

  /** The category name of a card, or nothing. */
  protected categoryName(task: Task): string {
    return this.store.categoryOf(task)?.name ?? '';
  }

  /** The people on a card. */
  protected peopleOf(task: Task): Contact[] {
    return assigneesOf(task, this.store.contacts());
  }

  /** Letters on an avatar. */
  protected initials(contact: Contact): string {
    return initialsOf(contact.name);
  }
}
