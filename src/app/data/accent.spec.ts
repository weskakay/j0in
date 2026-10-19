import { accentShades, contrast, isHexColor, rgbOf } from './accent';

/** Reads an rgb() value back into its channels. */
function channels(css: string): [number, number, number] {
  return css.match(/\d+/g)!.map(Number) as [number, number, number];
}

describe('accentShades', () => {
  it('keeps white labels on a deep colour and leaves it as it is', () => {
    const shades = accentShades('#1a237e');
    expect(shades.onAccent).toBe('rgb(255 255 255)');
    expect(shades.strong).toBe('rgb(26 35 126)');
  });

  it('puts dark labels on a light colour instead of darkening it to mud', () => {
    const shades = accentShades('#ffee00');
    expect(shades.onAccent).toBe('rgb(13 22 32)');
    expect(contrast(channels(shades.strong), channels(shades.onAccent))).toBeGreaterThanOrEqual(4.5);
  });

  it('darkens a middle colour just enough for white labels', () => {
    const shades = accentShades('#29abe2');
    expect(shades.onAccent).toBe('rgb(255 255 255)');
    expect(contrast(channels(shades.strong), [255, 255, 255])).toBeGreaterThanOrEqual(4.5);
  });

  it('makes the colour readable as text on both dark and light surfaces', () => {
    for (const hex of ['#1a237e', '#ffee00', '#ff00aa', '#00ff66']) {
      const shades = accentShades(hex);
      expect(contrast(channels(shades.inkDark), [31, 44, 60])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(channels(shades.inkLight), [230, 234, 242])).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('isHexColor', () => {
  it('accepts #rrggbb only', () => {
    expect(isHexColor('#ff00aa')).toBe(true);
    expect(isHexColor('#f0a')).toBe(false);
    expect(isHexColor('red')).toBe(false);
    expect(isHexColor('url(x)')).toBe(false);
  });
});

describe('rgbOf', () => {
  it('reads the three channels', () => {
    expect(rgbOf('#29abe2')).toEqual([41, 171, 226]);
  });
});
