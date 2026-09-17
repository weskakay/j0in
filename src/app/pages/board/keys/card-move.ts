import type { ColumnWithTasks } from '../../../core/board.store';
import type { Task } from '../../../data/models';

/** The four keys that shift a card once Alt is held down. */
export const ARROWS: readonly string[] = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

/** The two keys that browse the stack when nothing is being moved. */
export const VERTICAL: readonly string[] = ['ArrowUp', 'ArrowDown'];

/** Where a card goes when it is nudged, or null when it cannot move there. */
export function nextPlace(
  board: ColumnWithTasks[],
  task: Task,
  key: string,
): { columnId: string; position: number } | null {
  const column = board.findIndex((entry) => entry.column.id === task.columnId);
  if (column < 0) {
    return null;
  }
  const row = board[column].tasks.findIndex((one) => one.id === task.id);
  return key === 'ArrowUp' || key === 'ArrowDown'
    ? withinColumn(board[column], row, key)
    : acrossColumns(board, column, row, key);
}

/** One place up or down inside the same column. */
function withinColumn(
  entry: ColumnWithTasks,
  row: number,
  key: string,
): { columnId: string; position: number } | null {
  const target = key === 'ArrowUp' ? row - 1 : row + 1;
  if (target < 0 || target >= entry.tasks.length) {
    return null;
  }
  return { columnId: entry.column.id, position: target + 1 };
}

/** Into the neighbouring column, at the same height. */
function acrossColumns(
  board: ColumnWithTasks[],
  column: number,
  row: number,
  key: string,
): { columnId: string; position: number } | null {
  const target = key === 'ArrowLeft' ? column - 1 : column + 1;
  if (target < 0 || target >= board.length) {
    return null;
  }
  const into = board[target];
  return { columnId: into.column.id, position: Math.min(row + 1, into.tasks.length + 1) };
}

