import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BoardStore } from './board.store';
import type { BoardData } from '../data/models';

/** Mirrors the store's own minimum waiting time. */
const MIN_WAIT = 1400;

const BOARD: BoardData = {
  name: 'Mein Board',
  timeTracking: true,
  preferences: { weekCapacity: 32, focusGoal: 120, focusDefault: 25 },
  columns: [
    { id: 'c1', name: 'ToDo', position: 1 },
    { id: 'c2', name: 'Fertig', position: 2 },
  ],
  categories: [{ id: 'k1', name: 'Technisch', color: '#29abe2', position: 1, icon: null, description: null, status: 'active', dueDate: null, pinned: false }],
  phases: [],
  contacts: [],
  tasks: [
    {
      id: 't1', columnId: 'c1', categoryId: 'k1', title: 'Dach decken',
      description: 'Ziegel bestellen', dueDate: '2026-09-01', priority: 'urgent',
      position: 1, subtasks: [], contactIds: [], timeEntries: [], doneAt: null, estimateMinutes: null,
    },
    {
      id: 't2', columnId: 'c2', categoryId: null, title: 'Keller räumen',
      description: null, dueDate: null, priority: 'low',
      position: 1, subtasks: [], contactIds: [], timeEntries: [], doneAt: null, estimateMinutes: null,
    },
  ],
};

describe('BoardStore', () => {
  let store: BoardStore;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(BoardStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  /**
   * Answers the pending board request and lets the minimum waiting time of
   * the loading state elapse.
   */
  function deliverBoard(board = BOARD): void {
    store.load();
    http.expectOne('/api/board').flush(board);
    vi.advanceTimersByTime(MIN_WAIT);
  }

  it('ist zu Beginn leer und meldet sich nicht als bereit', () => {
    expect(store.ready()).toBe(false);
    expect(store.columns()).toEqual([]);
    expect(store.loading()).toBe(false);
  });

  it('übernimmt Name, Spalten und Karten aus einer Antwort', () => {
    deliverBoard();
    expect(store.ready()).toBe(true);
    expect(store.name()).toBe('Mein Board');
    expect(store.columns().length).toBe(2);
    expect(store.tasks().length).toBe(2);
    expect(store.loading()).toBe(false);
  });

  it('ordnet jede Karte ihrer Spalte zu', () => {
    deliverBoard();
    const board = store.board();
    expect(board[0].column.name).toBe('ToDo');
    expect(board[0].tasks.map((t) => t.id)).toEqual(['t1']);
    expect(board[1].tasks.map((t) => t.id)).toEqual(['t2']);
  });

  it('sucht in Titel und Beschreibung, ohne auf Groß und Klein zu achten', () => {
    deliverBoard();
    store.setSearch('DACH');
    expect(store.board()[0].tasks.map((t) => t.id)).toEqual(['t1']);
    expect(store.board()[1].tasks).toEqual([]);

    store.setSearch('ziegel');
    expect(store.board()[0].tasks.map((t) => t.id)).toEqual(['t1']);

    store.setSearch('  ');
    expect(store.tasks().length).toBe(2);
  });

  it('lässt die Spalten stehen, auch wenn keine Karte passt', () => {
    deliverBoard();
    store.setSearch('gibt es nicht');
    expect(store.board().length).toBe(2);
    expect(store.board().every((entry) => entry.tasks.length === 0)).toBe(true);
  });

  it('findet die Kategorie einer Karte und erfindet keine', () => {
    deliverBoard();
    expect(store.categoryOf(BOARD.tasks[0])?.name).toBe('Technisch');
    expect(store.categoryOf(BOARD.tasks[1])).toBeNull();
  });

  it('behält das Board bei einem Fehler und meldet ihn', () => {
    deliverBoard();
    store.load();
    http.expectOne('/api/board').flush({ error: 'Kaputt' }, { status: 500, statusText: 'Error' });
    vi.advanceTimersByTime(MIN_WAIT);
    expect(store.error()).toBe('Kaputt');
    expect(store.tasks().length).toBe(2);
    expect(store.loading()).toBe(false);
  });

  it('vergisst alles, damit ein zweites Konto nichts vom ersten sieht', () => {
    deliverBoard();
    store.setSearch('dach');
    store.clear();
    expect(store.ready()).toBe(false);
    expect(store.tasks()).toEqual([]);
    expect(store.search()).toBe('');
  });

  it('hakt eine Teilaufgabe sofort ab und schickt die Änderung hinterher', () => {
    store.load();
    const withSub = structuredClone(BOARD);
    withSub.tasks[0].subtasks = [{ id: 's1', title: 'Ziegel', isDone: false, position: 1 }];
    http.expectOne('/api/board').flush(withSub);
    vi.advanceTimersByTime(MIN_WAIT);

    store.toggleSubtask('t1', 's1', true);
    expect(store.tasks()[0].subtasks[0].isDone).toBe(true);
    http.expectOne('/api/subtasks/s1').flush({ ok: true });
  });

  it('meldet die Zeiterfassung erst als an, wenn das Board da ist', () => {
    expect(store.timeTracking()).toBe(false);
    deliverBoard();
    expect(store.timeTracking()).toBe(true);
  });

  it('übernimmt eine abgeschaltete Zeiterfassung aus der Antwort', () => {
    const off = structuredClone(BOARD);
    off.timeTracking = false;
    deliverBoard(off);
    expect(store.timeTracking()).toBe(false);
  });

  it('schaltet die Zeiterfassung am Board um und liest danach neu', () => {
    deliverBoard();

    store.setTimeTracking(false).subscribe();
    const call = http.expectOne('/api/board/time-tracking');
    expect(call.request.method).toBe('PUT');
    expect(call.request.body).toEqual({ on: false });
    call.flush({ ok: true });

    const off = structuredClone(BOARD);
    off.timeTracking = false;
    http.expectOne('/api/board').flush(off);
    vi.advanceTimersByTime(MIN_WAIT);
    expect(store.timeTracking()).toBe(false);
  });

  it('nimmt einen missglückten Haken zurück', () => {
    store.load();
    const withSub = structuredClone(BOARD);
    withSub.tasks[0].subtasks = [{ id: 's1', title: 'Ziegel', isDone: false, position: 1 }];
    http.expectOne('/api/board').flush(withSub);
    vi.advanceTimersByTime(MIN_WAIT);

    store.toggleSubtask('t1', 's1', true);
    http.expectOne('/api/subtasks/s1').flush({ error: 'Nein' }, { status: 500, statusText: 'E' });
    expect(store.tasks()[0].subtasks[0].isDone).toBe(false);
    expect(store.error()).toBe('Nein');
  });
});
