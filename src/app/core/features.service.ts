import { Injectable, signal } from '@angular/core';

const STACK_KEY = 'j0in-card-stack';

/**
 * Remembers whether columns are shown as a stack. Like the theme this belongs
 * to the device someone is sitting at, so it stays in the browser.
 */
@Injectable({ providedIn: 'root' })
export class FeaturesService {
  /** Whether long columns lie as a stack instead of a full list. */
  readonly cardStack = signal<boolean>(read());

  /** Switches the stack over and remembers the choice. */
  toggleCardStack(): void {
    const next = !this.cardStack();
    this.cardStack.set(next);
    save(next);
  }
}

/** The stored choice, on by default and whenever it cannot be read. */
function read(): boolean {
  try {
    return localStorage.getItem(STACK_KEY) !== 'off';
  } catch {
    return true;
  }
}

/** Stores the choice, accepting a browser that refuses to. */
function save(on: boolean): void {
  try {
    localStorage.setItem(STACK_KEY, on ? 'on' : 'off');
  } catch {
    // Private windows and blocked site data are fine, the choice is then
    // forgotten on the next visit.
  }
}
