import { Component, inject, input, output } from '@angular/core';
import { LanguageService } from '../../../core/language.service';
import type { AccessRequest } from '../../../data/models';
import { dateIn, initialsOf } from '../../../data/format';
import type { Lang } from '../../../data/i18n';

/** The requests for access, each as a card with a yes and a no. */
@Component({
  selector: 'app-access-list',
  imports: [],
  templateUrl: './access-list.html',
  styleUrl: './access-list.scss',
})
export class AccessList {
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** Every request that is not approved, newest first. */
  readonly requests = input<AccessRequest[]>([]);

  /** True while the list is being fetched. */
  readonly loading = input(false);

  /** Id of the request a decision is currently running for. */
  readonly deciding = input('');

  /** Fires when an address should be let in. */
  readonly approved = output<AccessRequest>();

  /** Fires when a request should be turned down. */
  readonly declined = output<AccessRequest>();

  /** Letters on the avatar. */
  protected initials(request: AccessRequest): string {
    return initialsOf(request.name);
  }

  /** The date the request arrived, written the way the language does. */
  protected asked(request: AccessRequest): string {
    return dateTimeIn(request.created_at, this.language.lang());
  }

  /** Whether this request still needs a decision. */
  protected isOpen(request: AccessRequest): boolean {
    return request.status === 'pending';
  }
}

/** Turns "2026-08-29 14:12:03" into "29.08.2026, 14:12" or "29/08/2026, 14:12". */
function dateTimeIn(value: string, lang: Lang): string {
  const [date, time] = value.split(' ');
  const clock = (time ?? '').slice(0, 5);
  const written = dateIn(date ?? '', lang);
  return written ? `${written}, ${clock}` : value;
}
