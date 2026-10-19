/** One pickable colour, named so it can be offered as a choice. */
export interface Swatch {
  label: string;
  value: string;
}

/**
 * The colours a category or the accent can take.
 *
 * These are values, not styling: they are stored in the database on the
 * category and in the browser for the accent, so they live with the data and
 * not in a stylesheet. Every one of them has been checked against both
 * themes; the accent may also take a free colour, whose shades are then
 * worked out in data/accent.ts.
 */
export const SWATCHES: Swatch[] = [
  { label: 'Blau', value: '#29abe2' },
  { label: 'Violett', value: '#9327ff' },
  { label: 'Türkis', value: '#1fd7c1' },
  { label: 'Bernstein', value: '#ffa800' },
  { label: 'Rot', value: '#ff4646' },
  { label: 'Grün', value: '#4caf50' },
];

/** The colour a new category starts with. */
export const DEFAULT_SWATCH = SWATCHES[0].value;

/** Whether a stored colour is one this app offers. */
export function isKnownSwatch(value: string): boolean {
  return SWATCHES.some((swatch) => swatch.value.toLowerCase() === value.toLowerCase());
}
