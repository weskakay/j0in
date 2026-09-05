import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import type { User } from '../data/models';
import { LanguageService } from './language.service';

/** What the sign-up form sends. */
interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

/** What the sign-in form sends. */
interface SignInInput {
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
  private readonly language = inject(LanguageService);
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

  /**
   * True when this account may reach the calendar. The server decides it per
   * account and refuses the routes for everybody else, so this only keeps the
   * screen from offering something that would come back as a refusal.
   */
  readonly canUseCalendar = computed(() => this.currentUser()?.calendarEnabled === true);

  /** Asks the server who is signed in; called once when the app starts. */
  restore(): Observable<User | Record<string, never>> {
    return this.api
      .get<User | Record<string, never>>('/auth/me')
      .pipe(tap((result) => this.applyRestored(result)));
  }

  /**
   * Files a request for access. Nobody is signed in by this: the account only
   * becomes usable once the owner has approved it.
   */
  signUp(input: SignUpInput): Observable<{ pending: boolean }> {
    return this.api.post<{ pending: boolean }>('/auth/signup', input);
  }

  /** Signs in with email and password. */
  signIn(input: SignInInput): Observable<User> {
    return this.api.post<User>('/auth/login', input).pipe(tap((u) => this.currentUser.set(u)));
  }

  /** Signs in as the shared guest, seeding the demo board in the chosen language. */
  signInAsGuest(): Observable<User> {
    const body = { lang: this.language.lang() };
    return this.api.post<User>('/auth/guest', body).pipe(tap((u) => this.currentUser.set(u)));
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
