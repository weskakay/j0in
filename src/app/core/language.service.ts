import { Injectable, computed, signal } from '@angular/core';
import { TRANSLATIONS, type Dictionary, type ErrorCode, type Lang } from '../data/i18n';

const LANG_KEY = 'j0in-lang';

/**
 * Holds the language the interface is shown in. Like the theme, the choice
 * belongs to the device someone is sitting at, not to the account, so it is
 * kept in the browser.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  /** The language currently on screen. */
  readonly lang = signal<Lang>(readLang());

  /** Every piece of text, in the language currently on screen. */
  readonly dict = computed<Dictionary>(() => TRANSLATIONS[this.lang()]);

  constructor() {
    apply(this.lang());
    save(LANG_KEY, this.lang());
  }

  /** Switches the language, remembers it and tells the document about it. */
  set(lang: Lang): void {
    this.lang.set(lang);
    apply(lang);
    save(LANG_KEY, lang);
  }

  /**
   * Words an error the API answered with. An unknown code is not worth an
   * empty banner, so it falls back to the general wording.
   */
  message(code: string | null): string {
    if (code === null) {
      return '';
    }
    const words = this.dict().errors;
    return words[code as ErrorCode] ?? words['network.unknown'];
  }
}

/** Puts the language on the document, so screen readers pick the right voice. */
function apply(lang: Lang): void {
  document.documentElement.lang = lang;
}

/**
 * The language to start in. A `lang` in the address wins, so a visitor who
 * arrives from the portfolio keeps reading in the language they were in.
 * Otherwise the stored choice, and German as the fallback.
 */
function readLang(): Lang {
  return asLang(fromAddress()) ?? asLang(read(LANG_KEY)) ?? 'de';
}

/** The `lang` parameter of the current address, empty if there is none. */
function fromAddress(): string {
  try {
    return new URLSearchParams(location.search).get('lang') ?? '';
  } catch {
    return '';
  }
}

/** Turns a value into a language, or nothing if it names none. */
function asLang(value: string): Lang | null {
  return value === 'de' || value === 'en' ? value : null;
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
