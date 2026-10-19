import type { Dictionary, Lang } from '../../data/i18n';
import type { Task } from '../../data/models';
import { dateIn } from '../../data/format';
import { daysUntil } from '../../data/home';

/** How far off a card's due date is, the way people say it: today, tomorrow, in 3 days, overdue. */
export function dueLabel(task: Task, day: string, t: Dictionary, lang: Lang): string {
  return task.dueDate ? whenLabel(task.dueDate, day, t, lang) : '';
}

/** The same for a bare date. */
export function whenLabel(date: string, day: string, t: Dictionary, lang: Lang): string {
  const days = daysUntil(date, day);
  const words = t.home;
  if (days < 0) {
    return words.late;
  }
  const near = [words.today, words.tomorrow][days];
  if (near) {
    return near;
  }
  return days < 7 ? `${words.inPrefix} ${days} ${words.daysWord}` : dateIn(date, lang);
}
