import type { ProjectIconName } from './i18n/pages';

/** One line drawing per project icon, on a 24 by 24 grid, drawn with a stroke. */
export const PROJECT_ICONS: Record<ProjectIconName, string> = {
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18',
  rocket: 'M12 2c3 3 4 7 3 11l-1 3h-4l-1-3c-1-4 0-8 3-11zM9 13l-3 2 1 4 3-3M15 13l3 2-1 4-3-3M12 8h.01M11 19l1 3 1-3',
  phone: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
  brush: 'M14 4l6 6-8 8H6v-6zM6 18l-2 2',
  code: 'M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14',
  chart: 'M4 20h16M7 16v-5M12 16V6M17 16v-8',
  book: 'M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h9',
  flag: 'M5 21V4h12l-2 4 2 4H5',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  box: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9z',
};

/** Every icon name, in the order the picker shows them. */
export const PROJECT_ICON_NAMES = Object.keys(PROJECT_ICONS) as ProjectIconName[];

/** Whether a stored value names one of the icons. */
export function isProjectIcon(name: string | null): name is ProjectIconName {
  return name !== null && name in PROJECT_ICONS;
}
