import { Injectable, computed, inject, signal } from '@angular/core';
import { LookService } from './look.service';

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
  private readonly looks = inject(LookService);

  /** True while the side navigation shows icons only because someone folded it. */
  readonly navFolded = signal(read(NAV_KEY) === 'folded');

  /** Whether the screen is between 900 and 1100 pixels wide, kept current. */
  private readonly narrow = signal(narrowNow());

  /** True when the glass look folds the navigation on its own on a narrow desktop. */
  readonly autoFolded = computed(() => this.narrow() && this.looks.look() === 'glass');

  /** Whether the navigation shows icons only, by hand or on its own. */
  readonly folded = computed(() => this.navFolded() || this.autoFolded());

  constructor() {
    window.matchMedia?.(NARROW).addEventListener?.('change', (event) => this.narrow.set(event.matches));
  }

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

/** The width at which the glass look keeps the navigation to icons. */
const NARROW = '(min-width: 900px) and (max-width: 1099px)';

/** Whether the screen is that width right now. */
function narrowNow(): boolean {
  return window.matchMedia?.(NARROW).matches ?? false;
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
