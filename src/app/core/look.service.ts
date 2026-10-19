import { Injectable, signal } from '@angular/core';

/** The faces the app can wear. Hell and dunkel run on top of either. */
export type Look = 'classic' | 'glass';

/** Every look on offer, in the order the settings show them. */
export const LOOKS: Look[] = ['classic', 'glass'];

const LOOK_KEY = 'j0in-look';

/**
 * Remembers which look this device shows. Like the theme it belongs to the
 * screen someone sits at, so it lives in the browser and not on the server.
 */
@Injectable({ providedIn: 'root' })
export class LookService {
  /** The look on screen. */
  readonly look = signal<Look>(readLook());

  constructor() {
    apply(this.look());
  }

  /** Stores the choice and puts it on screen at once. */
  set(look: Look): void {
    this.look.set(look);
    apply(look);
    save(look);
  }

  /** Moves on to the next look, used by the command palette. */
  next(): void {
    const index = LOOKS.indexOf(this.look());
    this.set(LOOKS[(index + 1) % LOOKS.length]);
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

/** Reads the stored look, falling back to the classic one. */
function readLook(): Look {
  try {
    const stored = localStorage.getItem(LOOK_KEY);
    return LOOKS.find((look) => look === stored) ?? 'classic';
  } catch {
    return 'classic';
  }
}

/** Stores the look, quietly accepting a browser that refuses to. */
function save(look: Look): void {
  try {
    localStorage.setItem(LOOK_KEY, look);
  } catch {
    // Private windows and blocked site data are fine; the look is then
    // simply forgotten on the next visit.
  }
}
