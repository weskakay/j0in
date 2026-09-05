import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  /** Builds a fresh service, since the language is settled on creation. */
  function make(): LanguageService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(LanguageService);
  }

  /** Pretends the page was opened with the given query string. */
  function address(search: string): void {
    vi.spyOn(globalThis, 'location', 'get').mockReturnValue({ search } as Location);
  }

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('beginnt auf Deutsch, wenn weder Adresse noch Speicher etwas sagen', () => {
    expect(make().lang()).toBe('de');
  });

  it('merkt sich eine Umschaltung für den nächsten Besuch', () => {
    make().set('en');
    expect(localStorage.getItem('j0in-lang')).toBe('en');
    expect(make().lang()).toBe('en');
  });

  it('folgt der Sprache aus der Adresse, auch gegen den Speicher', () => {
    make().set('en');
    address('?lang=de');
    expect(make().lang()).toBe('de');
  });

  it('ignoriert eine Sprache, die es nicht gibt', () => {
    address('?lang=fr');
    expect(make().lang()).toBe('de');
  });

  it('schreibt die Sprache auf das Dokument', () => {
    make().set('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('gibt einen unbekannten Fehlercode als allgemeine Meldung aus', () => {
    const words = make();
    expect(words.message('auth.bad_credentials')).toBe('E-Mail oder Passwort stimmt nicht');
    expect(words.message('gibt.es.nicht')).toBe(words.dict().errors['network.unknown']);
    expect(words.message(null)).toBe('');
  });
});
