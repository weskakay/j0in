import { DE } from './de';
import { EN } from './en';
import type { Dictionary, Lang } from './types';

export type { Dictionary, ErrorCode, Lang } from './types';

/** Every dictionary, keyed by its language. */
export const TRANSLATIONS: Record<Lang, Dictionary> = { de: DE, en: EN };
