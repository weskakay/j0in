import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { BoardStore } from '../../core/board.store';
import { LanguageService } from '../../core/language.service';
import { hoursIn, localeOf } from '../../data/format';
import { partOfDay } from '../../data/home';
import { Loader } from '../../layout/loader/loader';
import { HomeData } from './home-data.service';
import { CategoriesWidget } from './widgets/categories-widget';
import { FocusWidget } from './widgets/focus-widget';
import { MineWidget } from './widgets/mine-widget';
import { NextWidget } from './widgets/next-widget';
import { NowWidget } from './widgets/now-widget';
import { TodayWidget } from './widgets/today-widget';
import { WeekWidget } from './widgets/week-widget';

/** Where the button to what comes next leads, and what it says. */
interface NextLink {
  label: string;
  link: string[];
}

/**
 * The start page: a greeting with the day's figures, and widgets for what is
 * due, what comes next, focus, the week and the categories.
 */
@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    Loader,
    TodayWidget,
    NextWidget,
    FocusWidget,
    MineWidget,
    WeekWidget,
    CategoriesWidget,
    NowWidget,
  ],
  providers: [HomeData],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly store = inject(BoardStore);
  private readonly auth = inject(AuthService);
  private readonly language = inject(LanguageService);
  /** The figures the page and its widgets share. */
  protected readonly data = inject(HomeData);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** True while a load is running. */
  protected readonly loading = this.store.loading;

  /** Message of a failed call, or null. */
  protected readonly error = this.store.error;

  /** Whether a board has arrived at all. */
  protected readonly ready = this.store.ready;

  /** Time of day plus the first name. */
  protected readonly hello = computed(() => {
    const first = (this.auth.user()?.name ?? '').split(' ')[0];
    const greeting = this.t().summary[partOfDay(new Date(this.data.now()).getHours())];
    return first ? `${greeting}, ${first}` : greeting;
  });

  /** The date written out, then what the day holds. */
  protected readonly dayLine = computed(() => {
    const date = new Intl.DateTimeFormat(this.locale(), { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(this.data.now()));
    const due = this.data.dueToday().length;
    const words = this.t().home;
    const tasks = `${due} ${due === 1 ? words.dueTodayOne : words.dueToday}`;
    const events = this.data.withCalendar() ? ` · ${this.data.events().length} ${words.eventsToday}` : '';
    return `${date} · ${tasks}${events}`;
  });

  /** Done today out of done plus still due today. */
  protected readonly done = computed(() => {
    const part = this.data.doneToday().length;
    return { part, whole: part + this.data.dueToday().length };
  });

  /** Hours booked today with one decimal, written the way the language does. */
  protected readonly focusHours = computed(() => hoursIn(this.data.focusSeconds(), this.language.lang()));

  /** The button to what comes next: the next event, else the next card due. */
  protected readonly next = computed<NextLink | null>(() => {
    const event = this.data.upcoming()[0];
    if (event) {
      const at = new Intl.DateTimeFormat(this.locale(), { hour: '2-digit', minute: '2-digit' });
      return { label: `${this.t().home.nextAt}: ${at.format(new Date(event.start))}`, link: ['/board'] };
    }
    const card = this.data.nextCard();
    return card ? { label: `${this.t().home.upNext}: ${card.title}`, link: ['/board', card.id] } : null;
  });

  /** The locale of the language on screen, for dates and numbers. */
  private locale(): string {
    return localeOf(this.language.lang());
  }

  /** Tries the load again after a failure. */
  protected retry(): void {
    this.store.load();
  }
}
