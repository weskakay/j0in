/** One slice of a chart: what it counts, how many, and in which colour. */
export interface ChartRow {
  label: string;
  count: number;
  color: string;
}

/** Everything the rows add up to. */
export function sumOf(rows: ChartRow[]): number {
  return rows.reduce((total, row) => total + row.count, 0);
}

/** Share of one row in percent, rounded, or 0 when there is nothing. */
export function shareOf(row: ChartRow, total: number): number {
  return total === 0 ? 0 : Math.round((row.count / total) * 100);
}
