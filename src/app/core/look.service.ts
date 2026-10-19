import { Injectable, signal } from '@angular/core';

/** The faces the app can wear. Hell and dunkel run on top of either. */
export type Look = 'classic' | 'glass';

/** Every look on offer, in the order the settings show them. */
export const LOOKS: Look[] = ['classic', 'glass'];

/** How frosted the glass starts out, on the slider's scale of 0 to 100. */
export const FROST_DEFAULT = 50;

const LOOK_KEY = 'j0in-look';
const FROST_KEY = 'j0in-frost';
const REFRACT_KEY = 'j0in-refract';

/** A browser that tells which engine it runs on. */
type BrandedNavigator = Navigator & { userAgentData?: { brands: { brand: string }[] } };

/**
 * Remembers which look this device shows, and how the glass of the glass
 * look is tuned. Like the theme it belongs to the screen someone sits at, so
 * it lives in the browser and not on the server.
 */
@Injectable({ providedIn: 'root' })
export class LookService {
  /** The look on screen. */
  readonly look = signal<Look>(readLook());

  /** How frosted the glass is, 0 for clear and 100 for nearly solid. */
  readonly frost = signal(readFrost());

  /** Whether the glass bars bend what lies behind them. */
  readonly refract = signal(read(REFRACT_KEY) === 'on');

  /** Whether this browser can draw the bending at all. */
  readonly canRefract = isChromium();

  constructor() {
    apply(this.look());
    applyFrost(this.frost());
    this.applyRefract();
  }

  /** Stores the choice and puts it on screen at once. */
  set(look: Look): void {
    this.look.set(look);
    apply(look);
    save(LOOK_KEY, look);
  }

  /** Moves on to the next look, used by the command palette. */
  next(): void {
    const index = LOOKS.indexOf(this.look());
    this.set(LOOKS[(index + 1) % LOOKS.length]);
  }

  /** Sets how frosted the glass is, kept between 0 and 100. */
  setFrost(value: number): void {
    const kept = Math.min(100, Math.max(0, Math.round(value)));
    this.frost.set(kept);
    applyFrost(kept);
    save(FROST_KEY, String(kept));
  }

  /** Switches the bending on or off. */
  setRefract(on: boolean): void {
    this.refract.set(on);
    this.applyRefract();
    save(REFRACT_KEY, on ? 'on' : 'off');
  }

  /** Marks the document for the bending, where the browser can draw it. */
  private applyRefract(): void {
    document.documentElement.toggleAttribute('data-refract', this.refract() && this.canRefract);
  }
}

/** Writes the look onto the document; the classic one needs no attribute. */
function apply(look: Look): void {
  const root = document.documentElement;
  if (look === 'classic') {
    root.removeAttribute('data-look');
    return;
  }
  root.setAttribute('data-look', look);
}

/** Hands the frost to the stylesheet as a share between 0 and 1. */
function applyFrost(value: number): void {
  document.documentElement.style.setProperty('--j0in-frost', String(value / 100));
}

/**
 * Only Chromium draws an SVG filter behind an element; the others would
 * drop the whole glass effect, so they keep the plain one.
 */
function isChromium(): boolean {
  const brands = (navigator as BrandedNavigator).userAgentData?.brands ?? [];
  return brands.some((entry) => entry.brand === 'Chromium');
}

/** Reads the stored look, falling back to the classic one. */
function readLook(): Look {
  const stored = read(LOOK_KEY);
  return LOOKS.find((look) => look === stored) ?? 'classic';
}

/** Reads the stored frost, falling back to the middle. */
function readFrost(): number {
  const stored = Number(read(FROST_KEY) || NaN);
  return Number.isFinite(stored) && stored >= 0 && stored <= 100 ? Math.round(stored) : FROST_DEFAULT;
}

/** Reads one value, treating a browser that refuses as an empty one. */
function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

/** Stores one value, quietly accepting a browser that refuses to. */
function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private windows and blocked site data are fine; the choice is then
    // simply forgotten on the next visit.
  }
}
