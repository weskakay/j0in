import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { guestGuard } from './core/guest.guard';

/**
 * Top-level route table. Everything behind the sign-in lives under the shell,
 * so header and navigation are drawn once instead of on every screen.
 * The wildcard entry must stay last.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
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
        path: 'home',
        loadComponent: () => import('./pages/home/home').then((m) => m.Home),
      },
      {
        path: 'projects',
        loadComponent: () => import('./pages/projects/projects').then((m) => m.Projects),
      },
      {
        path: 'calendar',
        loadComponent: () => import('./pages/calendar/calendar').then((m) => m.Calendar),
      },
      {
        path: 'insights',
        loadComponent: () => import('./pages/insights/insights').then((m) => m.Insights),
      },
      // The old start page lives on as a redirect, so saved links still land.
      { path: 'summary', redirectTo: 'home' },
      {
        path: 'board',
        loadComponent: () => import('./pages/board/board').then((m) => m.Board),
        // A card open in the panel; the board reads the id and draws the panel itself.
        children: [{ path: ':taskId', children: [] }],
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
  { path: '**', redirectTo: 'home' },
];
