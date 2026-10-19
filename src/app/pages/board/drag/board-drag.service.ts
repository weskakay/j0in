import { Injectable, signal } from '@angular/core';
import type { Task } from '../../../data/models';

/** How close to the edge the pointer has to be before the page creeps along. */
const EDGE = 90;

/** The same at the sides, narrower, since a phone is only a few fingers wide. */
const SIDE_EDGE = 40;

/** How many pixels each frame moves while creeping. */
const STEP = 12;

/** Where the pointer currently is, so the preview can follow it. */
export interface Point {
  x: number;
  y: number;
}

/** What a finished drag asks the board to do. */
export interface Drop {
  task: Task;
  columnId: string;
  position: number;
}

/** A card let go over the day, with the minute of day it landed on. */
export interface Slot {
  task: Task;
  minutes: number;
}

/** Either outcome of a drag, told apart by its kind. */
export type Landing = ({ kind: 'column' } & Drop) | ({ kind: 'slot' } & Slot);

/**
 * Where inside the card the pointer took hold, and how wide the card was.
 * Without this the card would jump under the pointer the moment it lifts.
 */
export interface Grab {
  dx: number;
  dy: number;
  width: number;
}

/**
 * Holds the state of one drag. The card directive feeds it, the board reads
 * it to draw the preview and to highlight the column under the pointer.
 */
@Injectable()
export class BoardDrag {
  /** The card being dragged, or null when nothing is. */
  readonly task = signal<Task | null>(null);

  /** Id of the column under the pointer, or null. */
  readonly overColumn = signal<string | null>(null);

  /** Where in that column the card would land, counted from zero. */
  readonly overIndex = signal(0);

  /** Minute of day the pointer rests on inside the day, or null. */
  readonly overSlot = signal<number | null>(null);

  /** Current pointer position in the viewport. */
  readonly point = signal<Point>({ x: 0, y: 0 });

  /** Where the card was taken hold of, so it keeps sitting under the hand. */
  readonly grab = signal<Grab>({ dx: 0, dy: 0, width: 0 });

  private frame: number | null = null;

  /** The row of columns, held for the length of a drag so it can creep sideways. */
  private row: HTMLElement | null = null;

  /** Begins a drag and remembers where it started. */
  start(task: Task, at: Point, grab: Grab): void {
    this.task.set(task);
    this.point.set(at);
    this.grab.set(grab);
    this.aimAt(at);
    this.row = document.querySelector<HTMLElement>('.board__columns');
    this.frame = requestAnimationFrame(() => this.creepAlong());
  }

  /**
   * Scrolls while the pointer rests near an edge: the page up and down, since
   * stacked columns would otherwise be out of reach, and the row of columns
   * sideways, where they stand next to each other or are swiped.
   */
  private creepAlong(): void {
    const { x, y } = this.point();
    const vertical = nearEdge(y, 0, window.innerHeight, EDGE);
    const box = this.row?.getBoundingClientRect();
    const sideways = box ? nearEdge(x, box.left, box.right, SIDE_EDGE) : 0;
    if (vertical !== 0 || sideways !== 0) {
      window.scrollBy(0, vertical * STEP);
      this.row?.scrollBy(sideways * STEP, 0);
      this.aimAt(this.point());
    }
    this.frame = requestAnimationFrame(() => this.creepAlong());
  }

  /** Follows the pointer and notes which column it is over. */
  move(at: Point): void {
    this.point.set(at);
    this.aimAt(at);
  }

  /**
   * Works out what the pointer rests on. The day wins over the columns: it
   * sits beside them, and a card let go there means a time, not an order.
   */
  private aimAt(at: Point): void {
    const slot = slotUnder(at);
    this.overSlot.set(slot);
    const column = slot === null ? columnUnder(at) : null;
    this.overColumn.set(column);
    this.overIndex.set(column === null ? 0 : gapUnder(column, at, this.task()?.id ?? ''));
  }

  /**
   * Ends the drag. Returns what to move where, or null when the card was
   * let go outside any column. A drop into its own column is allowed, that
   * is how a card is reordered.
   */
  end(): Landing | null {
    const task = this.task();
    const columnId = this.overColumn();
    const position = this.overIndex() + 1;
    const minutes = this.overSlot();
    this.cancel();
    if (!task) {
      return null;
    }
    if (minutes !== null) {
      return { kind: 'slot', task, minutes };
    }
    return columnId ? { kind: 'column', task, columnId, position } : null;
  }

  /** Drops the drag without moving anything. */
  cancel(): void {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    this.row = null;
    this.task.set(null);
    this.overColumn.set(null);
    this.overSlot.set(null);
  }
}

/**
 * The minute of day the pointer rests on inside the day column, snapped to a
 * quarter of an hour. Null when the pointer is anywhere else.
 */
function slotUnder(at: Point): number | null {
  const element = document.elementFromPoint(at.x, at.y);
  const grid = element?.closest<HTMLElement>('[data-day-grid]');
  return grid ? minuteIn(grid, at) : null;
}

/** The minute of day a point marks in the grid, snapped to a quarter hour. */
function minuteIn(grid: HTMLElement, at: Point): number | null {
  const perHour = Number(grid.dataset['hourHeight'] ?? 0);
  const first = Number(grid.dataset['firstHour'] ?? 0);
  if (perHour <= 0) {
    return null;
  }
  const top = grid.getBoundingClientRect().top;
  const minutes = first * 60 + ((at.y - top + grid.scrollTop) / perHour) * 60;
  return Math.max(0, Math.round(minutes / 15) * 15);
}

/**
 * The gap the pointer sits over, counted from zero. Every card is split at
 * its middle: above it the card lands before, below it after. The card being
 * dragged is skipped, otherwise it would count itself.
 */
function gapUnder(columnId: string, at: Point, draggedId: string): number {
  const column = document.querySelector(`[data-column-id="${columnId}"]`);
  const cards = [...(column?.querySelectorAll('[data-task-id]') ?? [])].filter(
    (card) => card.getAttribute('data-task-id') !== draggedId,
  );
  const before = cards.filter((card) => at.y > middleOf(card));
  return before.length;
}

/** The vertical middle of an element. */
function middleOf(element: Element): number {
  const box = element.getBoundingClientRect();
  return box.top + box.height / 2;
}

/** Id of the column the given point sits over, or null. */
function columnUnder(at: Point): string | null {
  const element = document.elementFromPoint(at.x, at.y);
  const column = element?.closest<HTMLElement>('[data-column-id]');
  return column?.dataset['columnId'] ?? null;
}

/** -1 near the start of a stretch, 1 near its end, 0 in between. */
function nearEdge(value: number, start: number, end: number, edge: number): -1 | 0 | 1 {
  if (value < start + edge) {
    return -1;
  }
  return value > end - edge ? 1 : 0;
}
