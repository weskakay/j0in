import type { TimeEntry } from './models';
import { focusLeft, focusShare } from './focus';

/** A running entry with just enough filled in. */
function entry(parts: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'e1',
    phaseId: null,
    note: null,
    startedAt: '2026-10-18 09:00:00',
    running: true,
    seconds: 60,
    target: 25,
    ...parts,
  };
}

describe('focusLeft', () => {
  it('counts down from the target, the time since reading included', () => {
    expect(focusLeft(entry(), 30)).toBe(25 * 60 - 90);
  });

  it('never goes below zero', () => {
    expect(focusLeft(entry({ seconds: 2000 }), 0)).toBe(0);
  });

  it('has nothing to count down without a target', () => {
    expect(focusLeft(entry({ target: null }), 0)).toBeNull();
  });

  it('ignores the time since reading once the entry has stopped', () => {
    expect(focusLeft(entry({ running: false }), 500)).toBe(25 * 60 - 60);
  });
});

describe('focusShare', () => {
  it('fills up towards the target', () => {
    expect(focusShare(entry({ seconds: 750 }), 0)).toBe(0.5);
  });

  it('stops at full', () => {
    expect(focusShare(entry({ seconds: 9000 }), 0)).toBe(1);
  });

  it('goes round once an hour without a target', () => {
    expect(focusShare(entry({ target: null, seconds: 5400 }), 0)).toBe(0.5);
  });
});
