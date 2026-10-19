import { Component, computed, inject } from '@angular/core';
import { BoardStore } from '../../../core/board.store';
import { LanguageService } from '../../../core/language.service';
import { dateOf } from '../../../data/board-filter';
import { localeOf } from '../../../data/format';
import { lastWeekTotal, weekCounts } from '../../../data/home';
import { Widget } from '../../../ui/widget/widget';
import { HomeData } from '../home-data.service';

/** One bar of the week. */
interface WeekBar {
  day: string;
  name: string;
  count: number;
  height: number;
  today: boolean;
}

/** Cards finished per day this week, as bars from Monday to Sunday. */
@Component({
  selector: 'app-week-widget',
  imports: [Widget],
  templateUrl: './week-widget.html',
  styleUrl: './week.scss',
})
export class WeekWidget {
  private readonly data = inject(HomeData);
  private readonly store = inject(BoardStore);
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** The seven bars, each as high as its share of the busiest day. */
  protected readonly bars = computed<WeekBar[]>(() => {
    const week = weekCounts(this.store.tasks(), this.data.day(), this.data.lastId());
    const most = Math.max(1, ...week.map((one) => one.count));
    const name = new Intl.DateTimeFormat(localeOf(this.language.lang()), { weekday: 'short' });
    return week.map((one) => ({
      day: one.day,
      name: name.format(dateOf(one.day)),
      count: one.count,
      height: Math.round((one.count / most) * 100),
      today: one.day === this.data.day(),
    }));
  });

  /** All cards finished this week. */
  protected readonly total = computed(() => this.bars().reduce((sum, bar) => sum + bar.count, 0));

  /** Change against last week in percent, or null when last week had nothing to compare. */
  protected readonly change = computed(() => {
    const before = lastWeekTotal(this.store.tasks(), this.data.day(), this.data.lastId());
    return before === 0 ? null : Math.round(((this.total() - before) / before) * 100);
  });
}
