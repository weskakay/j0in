import { TestBed } from '@angular/core/testing';
import { ColumnStack, STACK_LIMIT } from './column-stack.service';
import { BoardDrag } from '../drag/board-drag.service';
import type { ColumnWithTasks } from '../../../core/board.store';
import type { Task } from '../../../data/models';
import { FeaturesService } from '../../../core/features.service';

describe('ColumnStack', () => {
  /** A column of the given size, with only the parts the stack looks at. */
  function column(id: string, count: number): ColumnWithTasks {
    const tasks = Array.from({ length: count }, (_, i) => ({ id: `${id}-${i}` }) as Task);
    return { column: { id, name: id, position: 1 }, tasks };
  }

  /** A fresh stack, since it remembers the focus of every column. */
  function make(): { stack: ColumnStack; drag: BoardDrag } {
    TestBed.resetTestingModule();
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [ColumnStack, BoardDrag] });
    return { stack: TestBed.inject(ColumnStack), drag: TestBed.inject(BoardDrag) };
  }

  it('lässt eine kurze Spalte eine Liste bleiben', () => {
    expect(make().stack.stacked(column('a', STACK_LIMIT))).toBe(false);
  });

  it('stapelt, sobald eine Karte mehr als das Limit da ist', () => {
    expect(make().stack.stacked(column('a', STACK_LIMIT + 1))).toBe(true);
  });

  it('stapelt gar nicht, solange die Funktion abgeschaltet ist', () => {
    const { stack } = make();
    const features = TestBed.inject(FeaturesService);
    features.toggleCardStack();
    expect(stack.stacked(column('a', 20))).toBe(false);
    features.toggleCardStack();
    expect(stack.stacked(column('a', 20))).toBe(true);
  });

  it('klappt während eines Zuges auf, damit das Ablegen weiter trifft', () => {
    const { stack, drag } = make();
    drag.task.set({ id: 'x' } as Task);
    expect(stack.stacked(column('a', 20))).toBe(false);
  });

  it('beginnt bei der ersten Karte und blättert weiter', () => {
    const { stack } = make();
    const a = column('a', 5);
    expect(stack.focusOf(a)).toBe(0);
    stack.step(a, 2);
    expect(stack.focusOf(a)).toBe(2);
  });

  it('bleibt an beiden Enden stehen statt umzuspringen', () => {
    const { stack } = make();
    const a = column('a', 5);
    stack.step(a, -3);
    expect(stack.focusOf(a)).toBe(0);
    expect(stack.atStart(a)).toBe(true);
    stack.step(a, 99);
    expect(stack.focusOf(a)).toBe(4);
    expect(stack.atEnd(a)).toBe(true);
  });

  it('holt den Fokus zurück, wenn die Spalte kürzer geworden ist', () => {
    const { stack } = make();
    stack.to(column('a', 10), 9);
    expect(stack.focusOf(column('a', 3))).toBe(2);
  });

  it('hält jede Spalte für sich', () => {
    const { stack } = make();
    stack.to(column('a', 10), 4);
    expect(stack.focusOf(column('b', 10))).toBe(0);
  });

  it('misst den Abstand und die Tiefe zur Karte im Fokus', () => {
    const { stack } = make();
    const a = column('a', 10);
    stack.to(a, 3);
    expect(stack.offset(a, 3)).toBe(0);
    expect(stack.offset(a, 1)).toBe(-2);
    expect(stack.depth(a, 1)).toBe(2);
    expect(stack.depth(a, 9)).toBe(2);
  });

  it('lässt weit entfernte Karten weg, die nahen aber stehen', () => {
    const { stack } = make();
    const a = column('a', 12);
    stack.to(a, 5);
    expect(stack.hidden(a, 5)).toBe(false);
    expect(stack.hidden(a, 7)).toBe(false);
    expect(stack.hidden(a, 8)).toBe(true);
  });

  it('klappt eine Spalte auf und wieder zu', () => {
    const { stack } = make();
    const a = column('a', 20);
    stack.toggle(a);
    expect(stack.isOpen(a)).toBe(true);
    expect(stack.stacked(a)).toBe(false);
    stack.toggle(a);
    expect(stack.stacked(a)).toBe(true);
  });

  it('lässt die Seite scrollen, sobald der Stapel am Ende ist', () => {
    const { stack } = make();
    const a = column('a', 6);
    const wheel = () => new WheelEvent('wheel', { deltaY: 10, cancelable: true });

    const first = wheel();
    expect(stack.onWheel(first, a)).toBe(true);
    expect(stack.focusOf(a)).toBe(1);
    expect(first.defaultPrevented).toBe(true);

    stack.to(a, 5);
    const last = wheel();
    expect(stack.onWheel(last, a)).toBe(false);
    expect(last.defaultPrevented).toBe(false);
    expect(stack.focusOf(a)).toBe(5);
  });
});
