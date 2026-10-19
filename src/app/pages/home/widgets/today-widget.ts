import { Component, computed, inject } from '@angular/core';
import { BoardStore } from '../../../core/board.store';
import { LanguageService } from '../../../core/language.service';
import { share } from '../../../data/home';
import { hoursIn } from '../../../data/format';
import { Rings, type Ring } from '../../../ui/rings/rings';
import { Widget } from '../../../ui/widget/widget';
import { HomeData } from '../home-data.service';

/** One line of the legend beside the rings: a big figure and what it is out of. */
interface LegendRow {
  label: string;
  value: string;
  unit: string;
  color: string;
}

/**
 * The day as three rings: cards done against cards due, focus against the
 * daily goal, and events behind against events today. Without a calendar
 * the third ring counts subtasks instead.
 */
@Component({
  selector: 'app-today-widget',
  imports: [Widget, Rings],
  templateUrl: './today-widget.html',
  styleUrl: './today.scss',
})
export class TodayWidget {
  private readonly data = inject(HomeData);
  private readonly store = inject(BoardStore);

  private readonly language = inject(LanguageService);
  private readonly lang = this.language.lang;

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** Done and due cards of today. */
  private readonly tasks = computed(() => {
    const done = this.data.doneToday().length;
    return { part: done, whole: done + this.data.dueToday().length };
  });

  /** Past and all events, or ticked and all subtasks without a calendar. */
  private readonly third = computed(() => {
    if (this.data.withCalendar()) {
      const all = this.data.events().length;
      return { part: all - this.data.upcoming().length, whole: all };
    }
    const subtasks = this.store.tasks().flatMap((task) => task.subtasks);
    return { part: subtasks.filter((one) => one.isDone).length, whole: subtasks.length };
  });

  /** The legend, outer ring first. */
  protected readonly legend = computed<LegendRow[]>(() => {
    const words = this.t().home;
    const hours = (seconds: number) => hoursIn(seconds, this.lang());
    const third = this.data.withCalendar() ? words.ringEvents : words.ringSubtasks;
    return [
      { label: words.ringTasks, value: `${this.tasks().part}`, unit: `/ ${this.tasks().whole}`, color: 'var(--j0in-ring-tasks)' },
      { label: words.ringFocus, value: `${hours(this.data.focusSeconds())} h`, unit: `/ ${hours(this.data.focusGoal())} h`, color: 'var(--j0in-ring-focus)' },
      { label: third, value: `${this.third().part}`, unit: `/ ${this.third().whole}`, color: 'var(--j0in-ring-meet)' },
    ];
  });

  /** The rings, in the same order as the legend. */
  protected readonly rings = computed<Ring[]>(() => {
    const [tasks, focus, third] = this.legend();
    return [
      { label: tasks.label, value: share(this.tasks().part, this.tasks().whole), color: tasks.color },
      { label: focus.label, value: share(this.data.focusSeconds(), this.data.focusGoal()), color: focus.color },
      { label: third.label, value: share(this.third().part, this.third().whole), color: third.color },
    ];
  });
}

