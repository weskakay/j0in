import { TestBed } from '@angular/core/testing';
import { LookService } from './look.service';

describe('LookService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-look');
    document.documentElement.removeAttribute('data-refract');
  });

  it('hands the frost to the page as a share and keeps it within 0 to 100', () => {
    const looks = TestBed.inject(LookService);
    looks.setFrost(130);
    expect(looks.frost()).toBe(100);
    expect(document.documentElement.style.getPropertyValue('--j0in-frost')).toBe('1');
    expect(localStorage.getItem('j0in-frost')).toBe('100');
  });

  it('remembers the light bending, but marks the page only where it can be drawn', () => {
    const looks = TestBed.inject(LookService);
    looks.setRefract(true);
    expect(localStorage.getItem('j0in-refract')).toBe('on');
    expect(document.documentElement.hasAttribute('data-refract')).toBe(looks.canRefract);
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
