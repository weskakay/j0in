import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../core/language.service';
import { Loader } from '../../layout/loader/loader';
import { BoardStore } from '../../core/board.store';
import { Agenda } from './agenda/agenda';
import { CalendarData } from './calendar-data.service';
import { MonthView } from './month-view/month-view';
import { WeekView } from './week-view/week-view';

/**
 * The calendar: a month or a week of cards that come due, and with Google
 * connected the events beside them. Today stands next to it as a list.
 */
@Component({
  selector: 'app-calendar',
  imports: [RouterLink, Loader, MonthView, WeekView, Agenda],
  providers: [CalendarData],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar {
  private readonly store = inject(BoardStore);

  /** The calendar on screen. */
  protected readonly data = inject(CalendarData);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = inject(LanguageService).dict;

  /** True while a load is running. */
  protected readonly loading = this.store.loading;

  /** Whether a board has arrived at all. */
  protected readonly ready = this.store.ready;

  /** Jumps back to today. */
  protected toToday(): void {
    this.data.anchor.set(this.data.today);
  }
}
