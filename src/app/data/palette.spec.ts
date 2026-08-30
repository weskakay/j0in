import { DEFAULT_SWATCH, SWATCHES, isKnownSwatch } from './palette';

describe('Farbpalette', () => {
  it('bietet sechs Farben an', () => {
    expect(SWATCHES.length).toBe(6);
  });

  it('trägt nur Hex-Werte, keine CSS-Ausdrücke', () => {
    for (const swatch of SWATCHES) {
      expect(swatch.value).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('vergibt jede Farbe nur einmal', () => {
    const seen = new Set(SWATCHES.map((one) => one.value));
    expect(seen.size).toBe(SWATCHES.length);
  });

  it('beginnt mit einer Farbe aus der eigenen Liste', () => {
    expect(isKnownSwatch(DEFAULT_SWATCH)).toBe(true);
  });

  it('erkennt fremde Werte nicht an', () => {
    expect(isKnownSwatch('#123456')).toBe(false);
    expect(isKnownSwatch('')).toBe(false);
    expect(isKnownSwatch('rot')).toBe(false);
  });

  it('nimmt Groß- und Kleinschreibung gleich', () => {
    expect(isKnownSwatch(SWATCHES[0].value.toUpperCase())).toBe(true);
  });
});
