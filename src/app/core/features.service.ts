import { Injectable, signal } from '@angular/core';

const STACK_KEY = 'j0in-card-stack';
const SWIPE_KEY = 'j0in-swipe-columns';

/**
 * Remembers how the board lays out its columns. Like the theme this belongs
 * to the device someone is sitting at, so it stays in the browser.
 */
@Injectable({ providedIn: 'root' })
export class FeaturesService {
  /** Whether long columns lie as a stack instead of a full list. */
  readonly cardStack = signal<boolean>(read(STACK_KEY) !== 'off');

  /** Whether a phone shows one column at a time, swiped sideways, instead of all below each other. */
  readonly swipeColumns = signal<boolean>(read(SWIPE_KEY) === 'on');

  /** Switches the stack over and remembers the choice. */
  toggleCardStack(): void {
    const next = !this.cardStack();
    this.cardStack.set(next);
    save(STACK_KEY, next);
  }

  /** Switches between swiped and stacked columns on a phone. */
  toggleSwipeColumns(): void {
    const next = !this.swipeColumns();
    this.swipeColumns.set(next);
    save(SWIPE_KEY, next);
  }
}

/** One stored choice, empty whenever it cannot be read. */
function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

/** Stores a choice, accepting a browser that refuses to. */
function save(key: string, on: boolean): void {
  try {
    localStorage.setItem(key, on ? 'on' : 'off');
  } catch {
    // Private windows and blocked site data are fine, the choice is then
    // forgotten on the next visit.
  }
}
