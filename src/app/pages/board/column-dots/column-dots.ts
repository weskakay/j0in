import { Component, inject, input, output } from '@angular/core';
import { LanguageService } from '../../../core/language.service';

/** A row of dots under swiped columns: which one shows, and a way to jump to another. */
@Component({
  selector: 'app-column-dots',
  templateUrl: './column-dots.html',
  styleUrl: './column-dots.scss',
})
export class ColumnDots {
  /** Every piece of text, in the language currently on screen. */
  protected readonly t = inject(LanguageService).dict;

  /** The names of the columns, in board order. */
  readonly names = input.required<string[]>();

  /** The column on screen, counted from zero. */
  readonly active = input(0);

  /** Fires with the column to show. */
  readonly jump = output<number>();
}
