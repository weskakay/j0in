/** A colour as its three channels, 0 to 255. */
type Rgb = [number, number, number];

/**
 * The shades a free accent colour needs so text on it and in it stays
 * readable. Written as CSS values, ready to be set on the document.
 */
export interface AccentShades {
  /** Fill under labels: buttons, the active entry. */
  strong: string;
  /** The fill while hovered. */
  hover: string;
  /** The label colour on that fill. */
  onAccent: string;
  /** The colour as text on a dark surface. */
  inkDark: string;
  /** The colour as text on a light surface. */
  inkLight: string;
}

/** The text colours and surfaces the shades are measured against, as in the tokens. */
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
const DARK_TEXT: Rgb = [13, 22, 32];
const DARKEST_SURFACE: Rgb = [31, 44, 60];
const LIGHTEST_SURFACE: Rgb = [230, 234, 242];

/** The contrast normal text needs. */
const READABLE = 4.5;

/** How far a fill may be darkened before dark labels read better than white ones. */
const MAX_DARKENING = 0.4;

/** Whether a value is a colour written as #rrggbb. */
export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

/** Works out every shade of an accent picked freely. */
export function accentShades(hex: string): AccentShades {
  const color = rgbOf(hex);
  const darkened = shadeUntil(color, BLACK, WHITE, MAX_DARKENING);
  const strong = darkened ?? color;
  const onAccent = darkened ? WHITE : DARK_TEXT;
  return {
    strong: cssOf(strong),
    hover: cssOf(mix(strong, darkened ? BLACK : WHITE, 0.14)),
    onAccent: cssOf(onAccent),
    inkDark: cssOf(shadeUntil(color, WHITE, DARKEST_SURFACE, 1) ?? WHITE),
    inkLight: cssOf(shadeUntil(color, BLACK, LIGHTEST_SURFACE, 1) ?? BLACK),
  };
}

/**
 * Moves a colour towards black or white in small steps until it reads
 * against the given colour, or gives up past the limit.
 */
function shadeUntil(color: Rgb, toward: Rgb, against: Rgb, limit: number): Rgb | null {
  for (let amount = 0; amount <= limit + 0.001; amount += 0.02) {
    const shade = mix(color, toward, amount);
    if (contrast(shade, against) >= READABLE) {
      return shade;
    }
  }
  return null;
}

/** The contrast ratio of two colours, 1 to 21. */
export function contrast(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** How bright a colour looks, 0 for black and 1 for white. */
function luminance(color: Rgb): number {
  const [r, g, b] = color.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** A colour moved part of the way towards another. */
function mix(color: Rgb, toward: Rgb, amount: number): Rgb {
  return color.map((channel, index) => Math.round(channel + (toward[index] - channel) * amount)) as Rgb;
}

/** The channels of a #rrggbb colour. */
export function rgbOf(hex: string): Rgb {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)) as Rgb;
}

/** A colour as CSS. */
function cssOf([r, g, b]: Rgb): string {
  return `rgb(${r} ${g} ${b})`;
}
