import { Injectable, signal } from '@angular/core';
import type { Task } from '../../../data/models';

/** How close to the edge the pointer has to be before the page creeps along. */
const EDGE = 90;

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
}

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

  /** Current pointer position in the viewport. */
  readonly point = signal<Point>({ x: 0, y: 0 });

  /** Where the card was taken hold of, so it keeps sitting under the hand. */
  readonly grab = signal<Grab>({ dx: 0, dy: 0, width: 0 });

  private frame: number | null = null;

  /** Begins a drag and remembers where it started. */
  start(task: Task, at: Point, grab: Grab): void {
    this.task.set(task);
    this.point.set(at);
    this.grab.set(grab);
    this.overColumn.set(columnUnder(at));
    this.frame = requestAnimationFrame(() => this.creepAlong());
  }

  /**
   * Scrolls the page while the pointer rests near the top or bottom edge.
   * On a phone the columns sit above each other, so without this the target
   * column is simply out of reach.
   */
  private creepAlong(): void {
    const { y } = this.point();
    const up = y < EDGE;
    const down = y > window.innerHeight - EDGE;
    if (up || down) {
      window.scrollBy(0, up ? -STEP : STEP);
      this.overColumn.set(columnUnder(this.point()));
    }
    this.frame = requestAnimationFrame(() => this.creepAlong());
  }

  /** Follows the pointer and notes which column it is over. */
  move(at: Point): void {
    this.point.set(at);
    this.overColumn.set(columnUnder(at));
  }

  /**
   * Ends the drag. Returns what to move where, or null when the card was
   * dropped outside a column or back into the one it came from.
   */
  end(): Drop | null {
    const task = this.task();
    const columnId = this.overColumn();
    this.cancel();
    if (!task || !columnId || columnId === task.columnId) {
      return null;
    }
    return { task, columnId };
  }

  /** Drops the drag without moving anything. */
  cancel(): void {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    this.task.set(null);
    this.overColumn.set(null);
  }
}

/** Id of the column the given point sits over, or null. */
function columnUnder(at: Point): string | null {
  const element = document.elementFromPoint(at.x, at.y);
  const column = element?.closest<HTMLElement>('[data-column-id]');
  return column?.dataset['columnId'] ?? null;
}
