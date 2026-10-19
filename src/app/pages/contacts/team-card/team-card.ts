import { Component, computed, inject, input, output } from '@angular/core';
import { LanguageService } from '../../../core/language.service';
import { initialsOf } from '../../../data/format';
import type { Contact } from '../../../data/models';
import type { Presence } from '../../../data/presence';
import type { Member } from '../../../data/team';
import { SheenDirective } from '../../../ui/sheen.directive';

/** One person as a card: who, what they are up to and how full their week is. */
@Component({
  selector: 'app-team-card',
  hostDirectives: [SheenDirective],
  templateUrl: './team-card.html',
  styleUrl: './team-card.scss',
})
export class TeamCard {
  /** Every piece of text, in the language currently on screen. */
  protected readonly t = inject(LanguageService).dict;

  /** The person with their figures. */
  readonly member = input.required<Member>();

  /** What they are up to. */
  readonly presence = input.required<Presence>();

  /** The hours of a week. */
  readonly capacity = input(32);

  /** Fires when the profile is to be opened. */
  readonly profile = output<Contact>();

  /** The line about what they are up to. */
  protected readonly status = computed(() => {
    const entry = this.presence();
    const words = this.t().home;
    if (entry.state === 'focus') {
      return `${words.inFocus} · ${entry.focusTitle}`;
    }
    return entry.state === 'busy' ? `${entry.open} ${words.openTasks}` : words.free;
  });

  /** Letters on the avatar. */
  protected initials(contact: Contact): string {
    return initialsOf(contact.name);
  }
}
