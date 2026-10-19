import { Component, computed, inject, input } from '@angular/core';
import { LanguageService } from '../../../core/language.service';
import { type ChartRow, shareOf, sumOf } from './chart-row';

/** One piece of the strip, with the share it takes up. */
interface Segment {
  row: ChartRow;
  share: number;
}

/** A single strip split into coloured pieces, with a legend beneath it. */
@Component({
  selector: 'app-segments',
  imports: [],
  templateUrl: './segments.html',
  styleUrl: './segments.scss',
})
export class Segments {
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** Heading above the strip. */
  readonly caption = input.required<string>();

  /** The pieces, in the order they should appear. */
  readonly rows = input<ChartRow[]>([]);

  /** Everything the pieces add up to. */
  protected readonly total = computed(() => sumOf(this.rows()));

  /** Only the pieces that actually carry something. */
  protected readonly pieces = computed<Segment[]>(() =>
    this.rows()
      .filter((row) => row.count > 0)
      .map((row) => ({ row, share: shareOf(row, this.total()) })),
  );

  /** Share of one row, for the legend. */
  protected share(row: ChartRow): number {
    return shareOf(row, this.total());
  }
}
