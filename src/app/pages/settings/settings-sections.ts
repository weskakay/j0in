/** The sections of the settings, named like their texts under prefs. */
export type SectionKey = 'look' | 'board' | 'time' | 'focus' | 'calendar' | 'access' | 'account';

/** One entry of the settings navigation. */
export interface SectionEntry {
  key: SectionKey;
}

/** Every section in the order of the navigation. */
const ALL: SectionKey[] = ['look', 'board', 'time', 'focus', 'calendar', 'access', 'account'];

/** The sections someone sees; access to the app is the owner's business only. */
export function sectionsFor(owner: boolean): SectionEntry[] {
  return ALL.filter((key) => owner || key !== 'access').map((key) => ({ key }));
}

/** The section named in the address, falling back to the look. */
export function sectionFrom(value: string | null, owner: boolean): SectionKey {
  const known = sectionsFor(owner).find((entry) => entry.key === value);
  return known?.key ?? 'look';
}
