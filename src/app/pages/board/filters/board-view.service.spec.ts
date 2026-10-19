import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { BoardStore } from '../../../core/board.store';
import type { BoardData, Task } from '../../../data/models';
import { BoardView } from './board-view.service';

/** A card with just enough filled in. */
function card(id: string, parts: Partial<Task> = {}): Task {
  return {
    id, columnId: 'c1', categoryId: null, title: id, description: null, dueDate: null,
    priority: 'medium', position: 1, subtasks: [], contactIds: [], timeEntries: [],
    doneAt: null, estimateMinutes: null, ...parts,
  };
}

const BOARD: BoardData = {
  name: 'Board',
  timeTracking: false,
  columns: [{ id: 'c1', name: 'ToDo', position: 1 }],
  categories: [],
  phases: [],
  contacts: [],
  tasks: [card('a', { priority: 'urgent' }), card('b'), card('c', { priority: 'urgent' })],
};

describe('BoardView', () => {
  let view: BoardView;
  let store: BoardStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BoardView, provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(BoardStore);
    store.refresh();
    TestBed.inject(HttpTestingController).expectOne('/api/board').flush(BOARD);
    view = TestBed.inject(BoardView);
  });

  /** Puts a filter into the address bar, the way the filter bar does. */
  async function filterBy(params: Record<string, string>): Promise<void> {
    await TestBed.inject(Router).navigate([], { queryParams: params });
  }

  it('reports no matches only when a search or filter is set', async () => {
    expect(view.noMatches()).toBe(false);
    store.setSearch('gibt es nicht');
    expect(view.noMatches()).toBe(true);
    store.setSearch('');
    await filterBy({ priority: 'low' });
    expect(view.noMatches()).toBe(true);
  });

  it('narrows the columns to the filtered cards', async () => {
    await filterBy({ priority: 'urgent' });
    expect(view.board()[0].tasks.map((one) => one.id)).toEqual(['a', 'c']);
  });

  it('turns a place among the visible cards into one in the whole column', async () => {
    await filterBy({ priority: 'urgent' });
    expect(view.positionIn('c1', 2)).toBe(3);
    expect(view.positionIn('c1', 3)).toBe(4);
  });
});
