import { Component, computed, inject, input } from '@angular/core';
import { LanguageService } from '../../../core/language.service';
import { type ChartRow, shareOf, sumOf } from './chart-row';

/** Radius and stroke of the ring, in the units of its own viewBox. */
const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** One arc of the ring, ready to be drawn. */
interface Arc {
  row: ChartRow;
  dash: string;
  offset: number;
  share: number;
}

/** A ring chart with the total in its middle. */
@Component({
  selector: 'app-donut',
  imports: [],
  templateUrl: './donut.html',
  styleUrl: './donut.scss',
})
export class Donut {
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** Heading above the ring. */
  readonly caption = input.required<string>();

  /** What the number in the middle counts. */
  readonly unit = input('');

  /** The slices, in the order they should be drawn. */
  readonly rows = input<ChartRow[]>([]);

  /** Everything the slices add up to. */
  protected readonly total = computed(() => sumOf(this.rows()));

  /** The arcs, each already carrying its length and its starting point. */
  protected readonly arcs = computed<Arc[]>(() => this.buildArcs());

  /** Share of one slice, for the legend. */
  protected share(row: ChartRow): number {
    return shareOf(row, this.total());
  }

  /** Turns the rows into arcs that follow one another around the ring. */
  private buildArcs(): Arc[] {
    const total = this.total();
    let used = 0;
    return this.rows().map((row) => {
      const length = total === 0 ? 0 : (row.count / total) * CIRCUMFERENCE;
      const arc = arcFor(row, length, used, total);
      used += length;
      return arc;
    });
  }
}

/** One arc, placed after everything drawn before it. */
function arcFor(row: ChartRow, length: number, used: number, total: number): Arc {
  return {
    row,
    dash: `${length} ${CIRCUMFERENCE - length}`,
    offset: -used,
    share: shareOf(row, total),
  };
}
