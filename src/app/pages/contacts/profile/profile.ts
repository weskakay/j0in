import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/language.service';
import { initialsOf } from '../../../data/format';
import type { Contact } from '../../../data/models';
import type { Member } from '../../../data/team';
import { Rings, type Ring } from '../../../ui/rings/rings';

/** One person in full, shown in the panel beside the team. */
@Component({
  selector: 'app-profile',
  imports: [RouterLink, Rings],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  /** Every piece of text, in the language currently on screen. */
  protected readonly t = inject(LanguageService).dict;

  /** The person with their figures. */
  readonly member = input.required<Member>();

  /** Fires when the contact is to be edited. */
  readonly edit = output<Contact>();

  /** Fires when the contact is to be deleted. */
  readonly remove = output<Contact>();

  /** This week's done cards against done plus open, as one ring. */
  protected readonly ring = computed<Ring[]>(() => {
    const done = this.member().doneWeek;
    const whole = done + this.member().open.length;
    return [{ label: 'week', value: whole === 0 ? 0 : done / whole, color: 'var(--j0in-success)' }];
  });

  /** Letters on the avatar. */
  protected initials(contact: Contact): string {
    return initialsOf(contact.name);
  }
}
