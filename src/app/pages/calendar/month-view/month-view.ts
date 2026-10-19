import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/language.service';
import { dateOf } from '../../../data/board-filter';
import { CalendarData } from '../calendar-data.service';

/** How many entries a day cell lists before it sums up the rest. */
const SHOWN = 3;

/** A month as seven columns of day cells, each with its first few entries. */
@Component({
  selector: 'app-month-view',
  imports: [RouterLink],
  templateUrl: './month-view.html',
  styleUrl: './month-view.scss',
})
export class MonthView {
  /** The calendar on screen. */
  protected readonly data = inject(CalendarData);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = inject(LanguageService).dict;

  /** How many entries a cell lists. */
  protected readonly shown = SHOWN;

  /** The days of the month that hold something, for the list on a phone. */
  protected readonly busyDays = computed(() =>
    this.data.cells().filter((cell) => cell.inMonth && (this.data.entries(cell.day).length > 0 || cell.day === this.data.today)),
  );

  /** The day number of a date. */
  protected dayNumber(day: string): number {
    return dateOf(day).getDate();
  }

  /** Opens the week a day lies in. */
  protected openWeek(day: string): void {
    this.data.anchor.set(day);
    this.data.view.set('week');
  }
}
