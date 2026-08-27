import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Keeps unauthenticated visitors out of the protected screens.
 * On a cold start it first asks the server, so a valid cookie is honoured.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.ready()) {
    return auth.isSignedIn() ? true : router.createUrlTree(['/login']);
  }
  return auth.restore().pipe(map(() => auth.isSignedIn() || router.createUrlTree(['/login'])));
};
