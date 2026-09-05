import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ScheduleService } from './schedule.service';
import { CalendarService } from './calendar.service';
import { BoardStore } from './board.store';
import { AuthService } from './auth.service';
import type { Task, User } from '../data/models';

const CARD: Task = {
  id: 't1',
  columnId: 'c1',
  categoryId: null,
  title: 'Dach decken',
  description: null,
  dueDate: null,
  priority: 'medium',
  position: 1,
  subtasks: [],
  contactIds: [],
};

/** Signs a user in through the restore call, so the services see an account. */
function signIn(http: HttpTestingController, user: Partial<User>): void {
  TestBed.inject(AuthService).restore().subscribe();
  http.expectOne('/api/auth/me').flush({
    id: 'u1',
    name: 'Wer auch immer',
    email: 'wer@example.org',
    ...user,
  });
}

describe('ScheduleService', () => {
  let planned: ScheduleService;
  let calendar: CalendarService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    planned = TestBed.inject(ScheduleService);
    calendar = TestBed.inject(CalendarService);
    http = TestBed.inject(HttpTestingController);
  });

  it('legt eine Karte mit Datum, Minute und Dauer in den Tag', () => {
    planned.schedule(CARD.id, 600, '2026-09-07');
    const call = http.expectOne('/api/tasks/t1/schedule');
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toMatchObject({ date: '2026-09-07', minutes: 600, length: 60 });
    expect(call.request.body.timeZone).toBeTruthy();
  });

  it('merkt sich die laufende Karte und gibt sie danach wieder frei', () => {
    planned.schedule(CARD.id, 600, '2026-09-07');
    expect(planned.pending()).toBe('t1');
    http.expectOne('/api/tasks/t1/schedule').flush({ ok: true });
    expect(planned.pending()).toBeNull();
  });

  it('laedt den Tag neu, damit der Bildschirm zeigt, was der Kalender hat', () => {
    planned.schedule(CARD.id, 600, '2026-09-07');
    http.expectOne('/api/tasks/t1/schedule').flush({ ok: true });
    const reload = http.expectOne((r) => r.url.startsWith('/api/calendar/events'));
    expect(reload.request.method).toBe('GET');
    expect(reload.request.url).toContain('date=2026-09-07');
    expect(reload.request.url).toContain('tz=');
    expect(calendar.loadingDay()).toBe(true);
  });

  it('legt beim Klick in den Tag eine Karte an und plant sie ein', () => {
    vi.useFakeTimers();
    const store = TestBed.inject(BoardStore);
    store.load();
    http.expectOne('/api/board').flush({
      name: 'Mein Board',
      columns: [{ id: 'c1', name: 'ToDo', position: 1 }],
      categories: [],
      contacts: [],
      tasks: [],
    });
    vi.advanceTimersByTime(1400);
    vi.useRealTimers();
    planned.createInDay('  Dach decken  ', 600, '2026-09-07');
    const made = http.expectOne('/api/tasks');
    expect(made.request.method).toBe('POST');
    expect(made.request.body).toMatchObject({ columnId: 'c1', title: 'Dach decken', dueDate: '2026-09-07' });
    made.flush({ id: 't9' });
    expect(http.expectOne('/api/tasks/t9/schedule').request.method).toBe('POST');
  });

  it('legt nichts an, wenn der Titel leer ist', () => {
    planned.createInDay('   ', 600, '2026-09-07');
    http.expectNone('/api/tasks');
  });

  it('nimmt eine Karte wieder aus dem Tag', () => {
    planned.unschedule('t1', '2026-09-07');
    const call = http.expectOne('/api/tasks/t1/schedule');
    expect(call.request.method).toBe('DELETE');
  });

  it('bietet den Planer nicht an, solange der Kalender fuer das Konto zu ist', () => {
    signIn(http, { role: 'guest', calendarEnabled: false });
    expect(planned.possible()).toBe(false);
  });

  it('bietet den Planer an, sobald der Server das Konto freigeschaltet hat', () => {
    signIn(http, { role: 'owner', calendarEnabled: true });
    expect(planned.possible()).toBe(true);
  });

  it('behaelt den Grund, wenn das Schreiben scheitert', () => {
    planned.schedule(CARD.id, 600, '2026-09-07');
    http.expectOne('/api/tasks/t1/schedule').flush(
      { error: 'calendar.not_connected' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(planned.problem()).toBe('calendar.not_connected');
    expect(planned.pending()).toBeNull();
  });
});
