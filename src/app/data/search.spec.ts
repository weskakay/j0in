import { bestMatches, matchScore } from './search';

describe('matchScore', () => {
  it('rates a match at the start highest', () => {
    expect(matchScore('Board', 'bo')).toBe(4);
  });

  it('rates the start of a later word next', () => {
    expect(matchScore('Neue Aufgabe', 'auf')).toBe(3);
  });

  it('finds text in the middle of a word', () => {
    expect(matchScore('Einstellungen', 'stell')).toBe(2);
  });

  it('accepts letters that merely come in order', () => {
    expect(matchScore('Board', 'brd')).toBe(1);
  });

  it('needs three letters before letters in order count', () => {
    expect(matchScore('Einstellungen', 'su')).toBeNull();
  });

  it('ignores case and accents', () => {
    expect(matchScore('Übersicht', 'UBER')).toBe(4);
  });

  it('turns down letters in the wrong order', () => {
    expect(matchScore('Board', 'drb')).toBeNull();
  });

  it('lets everything through for an empty term', () => {
    expect(matchScore('Board', '  ')).toBe(0);
  });
});

describe('bestMatches', () => {
  const words = ['Kontakte', 'Board', 'Karte ablegen', 'Sonstiges'];

  it('puts the better match first and keeps the order among equals', () => {
    expect(bestMatches(words, 'a', (w) => w, 5)).toEqual(['Karte ablegen', 'Kontakte', 'Board']);
  });

  it('stops at the limit', () => {
    expect(bestMatches(words, '', (w) => w, 2)).toEqual(['Kontakte', 'Board']);
  });

  it('drops what does not match at all', () => {
    expect(bestMatches(words, 'xyz', (w) => w, 5)).toEqual([]);
  });
});
