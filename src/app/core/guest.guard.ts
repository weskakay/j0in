import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

/** Sends already signed-in visitors from login or sign-up to the summary. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.ready()) {
    return auth.isSignedIn() ? router.createUrlTree(['/summary']) : true;
  }
  return auth.restore().pipe(map(() => !auth.isSignedIn() || router.createUrlTree(['/summary'])));
};
