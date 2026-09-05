import { Injectable, signal } from '@angular/core';

const NAV_KEY = 'j0in-nav';
const WIDTH_KEY = 'j0in-column-width';
const PLANNER_KEY = 'j0in-planner';

/** How narrow and how wide a column may get, in pixels. */
export const COLUMN_MIN = 240;
export const COLUMN_MAX = 520;

/** The width a column has until someone drags it. */
const COLUMN_DEFAULT = 280;

/**
 * Remembers how wide the columns are and whether the side navigation is
 * folded away. Both belong to the screen someone is sitting at, not to the
 * account, so they live in the browser like the theme does.
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  /** True while the side navigation shows icons only. */
  readonly navFolded = signal(read(NAV_KEY) === 'folded');

  /** How wide one board column is, in pixels. */
  readonly columnWidth = signal(readWidth());

  /** True while the day is shown next to the board. */
  readonly plannerOpen = signal(read(PLANNER_KEY) === 'open');

  /** Folds the side navigation away, or brings the labels back. */
  toggleNav(): void {
    const folded = !this.navFolded();
    this.navFolded.set(folded);
    save(NAV_KEY, folded ? 'folded' : 'open');
  }

  /** Shows the day beside the board, or puts it away again. */
  togglePlanner(): void {
    const open = !this.plannerOpen();
    this.plannerOpen.set(open);
    save(PLANNER_KEY, open ? 'open' : 'closed');
  }

  /** Sets the column width, kept inside what still reads well. */
  setColumnWidth(width: number): void {
    const kept = Math.min(COLUMN_MAX, Math.max(COLUMN_MIN, Math.round(width)));
    this.columnWidth.set(kept);
    save(WIDTH_KEY, String(kept));
  }
}

/** Reads the stored width, falling back to the built-in one. */
function readWidth(): number {
  const stored = Number(read(WIDTH_KEY));
  if (!Number.isFinite(stored) || stored < COLUMN_MIN || stored > COLUMN_MAX) {
    return COLUMN_DEFAULT;
  }
  return Math.round(stored);
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
