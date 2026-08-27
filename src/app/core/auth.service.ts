import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import type { User } from '../data/models';

/** What the sign-up form sends. */
export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

/** What the sign-in form sends. */
export interface SignInInput {
  email: string;
  password: string;
  remember: boolean;
}

/**
 * Holds who is signed in. The password never reaches this service: it is
 * passed straight to the API and verified on the server.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly currentUser = signal<User | null>(null);
  private readonly checked = signal(false);

  /** The signed-in user, or null. */
  readonly user = this.currentUser.asReadonly();

  /** True once the app has asked the server who is signed in. */
  readonly ready = this.checked.asReadonly();

  /** True while somebody is signed in. */
  readonly isSignedIn = computed(() => this.currentUser() !== null);

  /** True when the current session belongs to the shared guest account. */
  readonly isGuest = computed(() => this.currentUser()?.role === 'guest');

  /** Asks the server who is signed in; called once when the app starts. */
  restore(): Observable<User | Record<string, never>> {
    return this.api
      .get<User | Record<string, never>>('/auth/me')
      .pipe(tap((result) => this.applyRestored(result)));
  }

  /** Registers a new account and signs it in. */
  signUp(input: SignUpInput): Observable<User> {
    return this.api.post<User>('/auth/signup', input).pipe(tap((u) => this.currentUser.set(u)));
  }

  /** Signs in with email and password. */
  signIn(input: SignInInput): Observable<User> {
    return this.api.post<User>('/auth/login', input).pipe(tap((u) => this.currentUser.set(u)));
  }

  /** Signs in as the shared guest, no input needed. */
  signInAsGuest(): Observable<User> {
    return this.api.post<User>('/auth/guest').pipe(tap((u) => this.currentUser.set(u)));
  }

  /** Ends the session on the server and forgets the user here. */
  signOut(): Observable<unknown> {
    return this.api.post('/auth/logout').pipe(tap(() => this.currentUser.set(null)));
  }

  /** The API answers with an empty object when nobody is signed in. */
  private applyRestored(result: User | Record<string, never>): void {
    const user = 'id' in result ? (result as User) : null;
    this.currentUser.set(user);
    this.checked.set(true);
  }
}
