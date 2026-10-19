import { Component, computed, inject, signal } from '@angular/core';
import { BoardStore } from '../../../core/board.store';
import { LanguageService } from '../../../core/language.service';
import { TimeTracker } from '../../../core/time-tracker.service';
import { durationText, initialsOf } from '../../../data/format';
import { phaseSecondsOn } from '../../../data/home';
import type { Contact } from '../../../data/models';
import { presenceOf, type Presence } from '../../../data/presence';
import { Widget } from '../../../ui/widget/widget';
import { HomeData } from '../home-data.service';

/** One phase with the time it got today. */
interface PhaseRow {
  id: string;
  name: string;
  text: string;
  percent: number;
}

/**
 * What is happening right now, in two views: the contacts with what they are
 * up to, worked out from the board, and where today's time went by phase.
 */
@Component({
  selector: 'app-now-widget',
  imports: [Widget],
  templateUrl: './now-widget.html',
  styleUrl: './now.scss',
})
export class NowWidget {
  private readonly data = inject(HomeData);
  private readonly store = inject(BoardStore);
  private readonly tracker = inject(TimeTracker);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = inject(LanguageService).dict;

  /** Which view is on screen. */
  protected readonly view = signal<'team' | 'time'>('team');

  /** The contacts with what they are up to. */
  protected readonly people = computed(() =>
    presenceOf(this.store.contacts(), this.store.tasks(), this.tracker.running()?.taskId ?? null, this.data.lastId()),
  );

  /** The phases that got time today, the most first. */
  protected readonly phases = computed<PhaseRow[]>(() => {
    const sums = phaseSecondsOn(this.store.tasks(), this.data.day(), this.tracker.sinceRead());
    const most = Math.max(1, ...Object.values(sums));
    const name = (id: string) => this.store.phases().find((phase) => phase.id === id)?.name ?? this.t().home.noPhase;
    return Object.entries(sums)
      .sort(([, a], [, b]) => b - a)
      .map(([id, seconds]) => ({ id, name: name(id), text: durationText(seconds), percent: (seconds / most) * 100 }));
  });

  /** The line under a name. */
  protected status(entry: Presence): string {
    const words = this.t().home;
    if (entry.state === 'focus') {
      return `${words.inFocus} · ${entry.focusTitle}`;
    }
    return entry.state === 'busy' ? `${entry.open} ${words.openTasks}` : words.free;
  }

  /** Letters on an avatar. */
  protected initials(contact: Contact): string {
    return initialsOf(contact.name);
  }
}
