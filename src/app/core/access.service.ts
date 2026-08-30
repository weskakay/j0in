import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import type { AccessRequest } from '../data/models';
import { ApiService } from './api.service';

/**
 * The requests for access and the decisions about them. Only the owner ever
 * reaches these calls; the server refuses everyone else.
 */
@Injectable({ providedIn: 'root' })
export class AccessService {
  private readonly api = inject(ApiService);
  private readonly items = signal<AccessRequest[]>([]);

  /** True while the list is being fetched. */
  readonly loading = signal(false);

  /** Message of the last failed call, or null. */
  readonly error = signal<string | null>(null);

  /** Every request that is not approved, newest first. */
  readonly requests = this.items.asReadonly();

  /** The requests still waiting for a decision. */
  readonly pending = computed(() => this.items().filter((one) => one.status === 'pending'));

  /** Fetches the list. */
  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get<{ requests: AccessRequest[] }>('/access').subscribe({
      next: (answer) => this.accept(answer.requests),
      error: (failure: Error) => this.reject(failure),
    });
  }

  /** Lets one address in and gives it a board. */
  approve(id: string): Observable<unknown> {
    return this.api.post(`/access/${id}/approve`).pipe(tap(() => this.load()));
  }

  /** Turns one request down. */
  decline(id: string): Observable<unknown> {
    return this.api.post(`/access/${id}/reject`).pipe(tap(() => this.load()));
  }

  /** Stores a freshly loaded list. */
  private accept(requests: AccessRequest[]): void {
    this.items.set(requests);
    this.loading.set(false);
  }

  /** Keeps the old list and reports what went wrong. */
  private reject(failure: Error): void {
    this.error.set(failure.message);
    this.loading.set(false);
  }
}
