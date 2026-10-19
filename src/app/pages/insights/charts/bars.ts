import { Component, computed, inject, input } from '@angular/core';
import { LanguageService } from '../../../core/language.service';
import { type ChartRow, shareOf, sumOf } from './chart-row';

/** Horizontal bars, one per row, scaled against the largest of them. */
@Component({
  selector: 'app-bars',
  imports: [],
  templateUrl: './bars.html',
  styleUrl: './bars.scss',
})
export class Bars {
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** Heading above the bars. */
  readonly caption = input.required<string>();

  /** The bars, in the order they should appear. */
  readonly rows = input<ChartRow[]>([]);

  /** The largest count, which defines the full width of a bar. */
  protected readonly peak = computed(() => Math.max(1, ...this.rows().map((row) => row.count)));

  /** Everything the bars add up to. */
  protected readonly total = computed(() => sumOf(this.rows()));

  /** Width of one bar as a share of the largest one. */
  protected width(row: ChartRow): number {
    return Math.round((row.count / this.peak()) * 100);
  }

  /** Share of one row in the whole group. */
  protected share(row: ChartRow): number {
    return shareOf(row, this.total());
  }
}
