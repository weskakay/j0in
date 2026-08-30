import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';
import { SWATCHES } from '../data/palette';

describe('ThemeService', () => {
  /** Builds a fresh service, since the stored choice is read on creation. */
  function make(): ThemeService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(ThemeService);
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.removeProperty('--j0in-accent');
  });

  it('folgt zu Beginn dem System und setzt nichts auf das Dokument', () => {
    const themes = make();
    expect(themes.theme()).toBe('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('schreibt eine feste Wahl auf das Dokument und merkt sie sich', () => {
    const themes = make();
    themes.set('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('j0in-theme')).toBe('dark');
  });

  it('nimmt die gemerkte Wahl beim nächsten Start wieder auf', () => {
    localStorage.setItem('j0in-theme', 'light');
    const themes = make();
    expect(themes.theme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('gibt die Entscheidung an das System zurück', () => {
    const themes = make();
    themes.set('dark');
    themes.set('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('setzt die Akzentfarbe und leitet den Überfahr-Ton daraus ab', () => {
    const themes = make();
    const color = SWATCHES[1].value;
    themes.setAccent(color);
    const root = document.documentElement.style;
    expect(root.getPropertyValue('--j0in-accent')).toBe(color);
    expect(root.getPropertyValue('--j0in-accent-hover')).toContain('color-mix');
  });

  it('stellt mit einem leeren Wert die eingebaute Farbe wieder her', () => {
    const themes = make();
    themes.setAccent(SWATCHES[1].value);
    themes.setAccent('');
    expect(document.documentElement.style.getPropertyValue('--j0in-accent')).toBe('');
  });

  it('übernimmt keine gespeicherte Farbe, die es nicht anbietet', () => {
    localStorage.setItem('j0in-accent', '#123456');
    expect(make().accent()).toBe('');
  });

  it('ignoriert einen unbekannten gespeicherten Wert für das Aussehen', () => {
    localStorage.setItem('j0in-theme', 'neon');
    expect(make().theme()).toBe('system');
  });
});
