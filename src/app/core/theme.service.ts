import { Injectable, signal } from '@angular/core';
import { isKnownSwatch } from '../data/palette';

/** What the visitor picked: follow the system, or a fixed choice. */
export type Theme = 'system' | 'light' | 'dark';

const THEME_KEY = 'j0in-theme';
const ACCENT_KEY = 'j0in-accent';

/**
 * Remembers whether the app follows the operating system or a fixed choice.
 * The decision lives in the browser, not on the server: it belongs to the
 * device someone is sitting at, not to the account.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** The current choice. */
  readonly theme = signal<Theme>(readTheme());

  /** Whether the operating system asks for light, kept current while the app runs. */
  private readonly systemLight = signal(prefersLight());

  /** The accent colour in use, or the empty string for the built-in one. */
  readonly accent = signal<string>(readAccent());

  constructor() {
    this.apply(this.theme());
    this.applyAccent(this.accent());
    window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', (event) =>
      this.systemLight.set(event.matches),
    );
  }

  /** Stores the choice and puts it on screen at once. */
  set(theme: Theme): void {
    this.theme.set(theme);
    this.apply(theme);
    save(THEME_KEY, theme);
  }

  /** Whether the screen ends up dark right now, whatever the choice behind it. */
  isDark(): boolean {
    const theme = this.theme();
    if (theme !== 'system') {
      return theme === 'dark';
    }
    return !this.systemLight();
  }

  /** Switches between light and dark, leaving the system setting behind. */
  toggle(): void {
    this.set(this.isDark() ? 'light' : 'dark');
  }

  /** Switches the accent colour; an empty value restores the built-in one. */
  setAccent(color: string): void {
    this.accent.set(color);
    this.applyAccent(color);
    save(ACCENT_KEY, color);
  }

  /** Writes the accent onto the document, or removes the override. */
  private applyAccent(color: string): void {
    const root = document.documentElement;
    if (color === '') {
      root.style.removeProperty('--j0in-accent');
      root.style.removeProperty('--j0in-accent-hover');
      return;
    }
    root.style.setProperty('--j0in-accent', color);
    root.style.setProperty('--j0in-accent-hover', darker(color));
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

/**
 * A darker shade of the same colour, for the hovered state. Mixing in the
 * browser keeps one colour as the single source instead of storing a second
 * one that could drift away from it.
 */
function darker(color: string): string {
  return `color-mix(in srgb, ${color} 62%, black)`;
}

/** Whether the operating system asks for a light screen right now. */
function prefersLight(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false;
}

/** Reads the stored choice, falling back to following the system. */
function readTheme(): Theme {
  const stored = read(THEME_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

/** Reads the stored accent, but only if it is a colour this app offers. */
function readAccent(): string {
  const stored = read(ACCENT_KEY);
  return isKnownSwatch(stored) ? stored : '';
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
