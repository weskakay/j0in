import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { guestGuard } from './core/guest.guard';

/**
 * Top-level route table. Everything behind the sign-in lives under the shell,
 * so header and navigation are drawn once instead of on every screen.
 * The wildcard entry must stay last.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'summary' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'signup',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/signup/signup').then((m) => m.Signup),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: 'summary',
        loadComponent: () => import('./pages/summary/summary').then((m) => m.Summary),
      },
      {
        path: 'board',
        loadComponent: () => import('./pages/board/board').then((m) => m.Board),
      },
      {
        path: 'contacts',
        loadComponent: () => import('./pages/contacts/contacts').then((m) => m.Contacts),
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings').then((m) => m.Settings),
      },
    ],
  },
  { path: '**', redirectTo: 'summary' },
];
