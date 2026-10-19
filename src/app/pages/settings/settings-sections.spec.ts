import { sectionFrom, sectionsFor } from './settings-sections';

describe('settings sections', () => {
  it('shows access to the owner only', () => {
    expect(sectionsFor(false).map((one) => one.key)).not.toContain('access');
    expect(sectionsFor(true).map((one) => one.key)).toContain('access');
  });

  it('falls back to the look for anything unknown or not allowed', () => {
    expect(sectionFrom('focus', false)).toBe('focus');
    expect(sectionFrom('access', false)).toBe('look');
    expect(sectionFrom(null, true)).toBe('look');
  });
});
