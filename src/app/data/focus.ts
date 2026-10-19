import type { TimeEntry } from './models';
import { entrySeconds } from './format';

/** The focus lengths on offer, in minutes. */
export const FOCUS_LENGTHS = [15, 25, 50] as const;

/** One of the focus lengths. */
export type FocusLength = (typeof FOCUS_LENGTHS)[number];

/** The length a focus starts with when nothing else was picked. */
export const DEFAULT_FOCUS: FocusLength = 25;

/** Seconds left of a focus run, never below zero; null for an open-ended timer. */
export function focusLeft(entry: TimeEntry, sinceRead: number): number | null {
  if (entry.target === null) {
    return null;
  }
  return Math.max(0, entry.target * 60 - entrySeconds(entry, sinceRead));
}

/**
 * How far a run has come, between 0 and 1. A focus run fills up towards its
 * target, an open-ended timer goes round once an hour.
 */
export function focusShare(entry: TimeEntry, sinceRead: number): number {
  const seconds = entrySeconds(entry, sinceRead);
  if (entry.target === null) {
    return (seconds % 3600) / 3600;
  }
  return Math.min(1, seconds / (entry.target * 60));
}
