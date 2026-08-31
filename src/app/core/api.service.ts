import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import type { ErrorCode } from '../data/i18n';

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
 * Turns an HTTP failure into the code the screens store. The API answers with
 * `{ error: "<code>" }`; the wording happens where the language is known.
 */
function toMessage(response: HttpErrorResponse): Observable<never> {
  const body = response.error as ApiError | null;
  return throwError(() => new Error(body?.error ?? fallbackFor(response.status)));
}

/** A code for the cases where the API itself said nothing. */
function fallbackFor(status: number): ErrorCode {
  if (status === 0) {
    return 'network.offline';
  }
  if (status === 429) {
    return 'rate.too_many';
  }
  return 'network.unknown';
}
