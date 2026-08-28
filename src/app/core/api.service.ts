import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

const BASE = '/api';

/** Shape of the error body the API returns. */
interface ApiError {
  error?: string;
}

/**
 * Talks to the PHP API. Every call sends the session cookie, which is what
 * `withCredentials` is for; the cookie itself is unreadable from script.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  /** GET a resource. */
  get<T>(path: string): Observable<T> {
    return this.http
      .get<T>(`${BASE}${path}`, { withCredentials: true })
      .pipe(catchError(toMessage));
  }

  /** POST a body and read the answer. */
  post<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http
      .post<T>(`${BASE}${path}`, body, { withCredentials: true })
      .pipe(catchError(toMessage));
  }

  /** PUT a body and read the answer. */
  put<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http
      .put<T>(`${BASE}${path}`, body, { withCredentials: true })
      .pipe(catchError(toMessage));
  }

  /**
   * DELETE a resource. A body is allowed, because removing a column also has
   * to say what should happen to the cards inside it.
   */
  delete<T>(path: string, body?: unknown): Observable<T> {
    return this.http
      .delete<T>(`${BASE}${path}`, { withCredentials: true, body })
      .pipe(catchError(toMessage));
  }
}

/**
 * Turns an HTTP failure into a plain message the screens can show.
 * The API always answers with `{ error: "..." }`, so that text is preferred.
 */
function toMessage(response: HttpErrorResponse): Observable<never> {
  const body = response.error as ApiError | null;
  const message = body?.error ?? fallbackFor(response.status);
  return throwError(() => new Error(message));
}

/** A readable message for the cases where the API said nothing useful. */
function fallbackFor(status: number): string {
  if (status === 0) {
    return 'Keine Verbindung zum Server';
  }
  if (status === 429) {
    return 'Zu viele Versuche, bitte kurz warten';
  }
  return 'Da ist etwas schiefgelaufen';
}
