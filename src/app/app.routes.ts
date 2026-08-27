import { Routes } from '@angular/router';

/** Top-level route table; the wildcard entry must stay last. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
];
