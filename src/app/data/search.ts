/** Letters merely in order count only from this many typed letters on, or "su" finds half the list. */
const LOOSE_FROM = 3;

/**
 * How well a text matches what was typed; higher is better, null is no match.
 * A match at the start beats one at the start of a word, which beats one in
 * the middle, which beats letters merely appearing in order ("brd" for
 * "Board", from three letters on). Case and accents do not count.
 */
export function matchScore(text: string, term: string): number | null {
  const needle = fold(term).trim();
  return needle === '' ? 0 : rank(fold(text), needle);
}

/** The score of a needle that is known not to be empty. */
function rank(hay: string, needle: string): number | null {
  if (hay.startsWith(needle)) {
    return 4;
  }
  if (hay.includes(` ${needle}`)) {
    return 3;
  }
  if (hay.includes(needle)) {
    return 2;
  }
  return needle.length >= LOOSE_FROM && inOrder(hay, needle) ? 1 : null;
}

/** The items matching a term, best first, at most the given number. */
export function bestMatches<T>(items: T[], term: string, textOf: (item: T) => string, limit: number): T[] {
  return items
    .map((item, index) => ({ item, index, score: matchScore(textOf(item), term) }))
    .filter((hit): hit is { item: T; index: number; score: number } => hit.score !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((hit) => hit.item);
}

/** Lower case without accents, so "Übersicht" is found by "ubersicht". */
function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Whether every letter of the needle shows up in the haystack, in order. */
function inOrder(hay: string, needle: string): boolean {
  let at = 0;
  for (const letter of needle) {
    at = hay.indexOf(letter, at);
    if (at === -1) {
      return false;
    }
    at += 1;
  }
  return true;
}
