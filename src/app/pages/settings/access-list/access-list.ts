import { Component, input, output } from '@angular/core';
import type { AccessRequest } from '../../../data/models';
import { initialsOf } from '../../../data/format';

/** The requests for access, each as a card with a yes and a no. */
@Component({
  selector: 'app-access-list',
  imports: [],
  templateUrl: './access-list.html',
  styleUrl: './access-list.scss',
})
export class AccessList {
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

  /** German wording for the date the request arrived. */
  protected asked(request: AccessRequest): string {
    return germanDateTime(request.created_at);
  }

  /** Whether this request still needs a decision. */
  protected isOpen(request: AccessRequest): boolean {
    return request.status === 'pending';
  }
}

/** Turns "2026-08-29 14:12:03" into "29.08.2026 um 14:12". */
function germanDateTime(value: string): string {
  const [date, time] = value.split(' ');
  const [year, month, day] = (date ?? '').split('-');
  const clock = (time ?? '').slice(0, 5);
  return day ? `${day}.${month}.${year} um ${clock}` : value;
}
