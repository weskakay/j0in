import { TestBed } from '@angular/core/testing';
import { FeaturesService } from './features.service';

describe('FeaturesService', () => {
  /** A fresh service, since the stored choice is read on creation. */
  function make(): FeaturesService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(FeaturesService);
  }

  beforeEach(() => localStorage.clear());

  it('hat den Stapel zu Beginn an', () => {
    expect(make().cardStack()).toBe(true);
  });

  it('schaltet um und merkt sich das über einen Neustart', () => {
    const first = make();
    first.toggleCardStack();
    expect(first.cardStack()).toBe(false);
    expect(make().cardStack()).toBe(false);
  });

  it('schaltet auch wieder zurück', () => {
    const features = make();
    features.toggleCardStack();
    features.toggleCardStack();
    expect(features.cardStack()).toBe(true);
    expect(make().cardStack()).toBe(true);
  });

  it('nimmt Unsinn im Speicher als an hin', () => {
    localStorage.setItem('j0in-card-stack', 'weiss nicht');
    expect(make().cardStack()).toBe(true);
  });

  it('legt die Spalten am Handy zu Beginn untereinander und merkt sich das Wischen', () => {
    const first = make();
    expect(first.swipeColumns()).toBe(false);
    first.toggleSwipeColumns();
    expect(make().swipeColumns()).toBe(true);
  });
});
