import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/language.service';
import { clockOf, type DayEntry } from '../../../data/calendar-grid';
import { CalendarData } from '../calendar-data.service';

/** One line of the agenda: an entry, or the marker for the present moment. */
type AgendaLine = { kind: 'entry'; entry: DayEntry } | { kind: 'now'; time: string };

/** Today in order, with a line where the present moment lies. */
@Component({
  selector: 'app-agenda',
  imports: [RouterLink],
  templateUrl: './agenda.html',
  styleUrl: './agenda.scss',
})
export class Agenda {
  private readonly data = inject(CalendarData);
  private readonly minute = signal(nowMinutes());

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = inject(LanguageService).dict;

  /** Today's entries with the present moment put in between. */
  protected readonly lines = computed<AgendaLine[]>(() => {
    const now = this.minute();
    const entries = this.data.entries(this.data.today);
    const before = entries.filter((entry) => entry.start !== null && entry.start < now);
    const after = entries.filter((entry) => !before.includes(entry));
    const wrap = (entry: DayEntry): AgendaLine => ({ kind: 'entry', entry });
    return [...before.map(wrap), { kind: 'now', time: clockOf(now) }, ...after.map(wrap)];
  });

  /** Whether today holds anything at all. */
  protected readonly empty = computed(() => this.data.entries(this.data.today).length === 0);

  constructor() {
    const ticking = setInterval(() => this.minute.set(nowMinutes()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(ticking));
  }

  /** The time of an entry, or the word for a whole day. */
  protected time(entry: DayEntry): string {
    return entry.start === null ? this.t().calendar.due : clockOf(entry.start);
  }
}

/** Minutes after midnight right now. */
function nowMinutes(): number {
  const date = new Date();
  return date.getHours() * 60 + date.getMinutes();
}
