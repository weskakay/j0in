import { Injectable, signal } from '@angular/core';

/** What the visitor picked: follow the system, or a fixed choice. */
export type Theme = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'j0in-theme';

/**
 * Remembers whether the app follows the operating system or a fixed choice.
 * The decision lives in the browser, not on the server: it belongs to the
 * device someone is sitting at, not to the account.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** The current choice. */
  readonly theme = signal<Theme>(read());

  constructor() {
    this.apply(this.theme());
  }

  /** Stores the choice and puts it on screen at once. */
  set(theme: Theme): void {
    this.theme.set(theme);
    this.apply(theme);
    save(theme);
  }

  /** Writes the choice onto the document, or removes it to follow the system. */
  private apply(theme: Theme): void {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
      return;
    }
    root.setAttribute('data-theme', theme);
  }
}

/** Reads the stored choice, falling back to following the system. */
function read(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

/** Stores the choice, quietly accepting a browser that refuses to. */
function save(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private windows and blocked site data are fine; the choice is then
    // simply forgotten on the next visit.
  }
}
