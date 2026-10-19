import { TestBed } from '@angular/core/testing';
import { LookService } from './look.service';

describe('LookService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-look');
  });

  it('starts with the J0IN look and puts no attribute on the page', () => {
    const looks = TestBed.inject(LookService);
    expect(looks.look()).toBe('classic');
    expect(document.documentElement.hasAttribute('data-look')).toBe(false);
  });

  it('puts the glass look on the page and remembers it', () => {
    TestBed.inject(LookService).set('glass');
    expect(document.documentElement.getAttribute('data-look')).toBe('glass');
    expect(localStorage.getItem('j0in-look')).toBe('glass');
  });

  it('goes round the looks one by one', () => {
    const looks = TestBed.inject(LookService);
    looks.next();
    expect(looks.look()).toBe('glass');
    looks.next();
    expect(looks.look()).toBe('classic');
  });

  it('ignores a stored look it does not know', () => {
    localStorage.setItem('j0in-look', 'neon');
    expect(TestBed.inject(LookService).look()).toBe('classic');
  });
});
