/** Which kind of account is signed in. */
export type UserRole = 'user' | 'guest';

/** The signed-in user as the API returns it; never carries a password. */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

/** How urgent a task is. */
export type Priority = 'urgent' | 'medium' | 'low';

/** A board column; the column is the task's status. */
export interface Column {
  id: string;
  name: string;
  position: number;
}

/** A category a task can belong to, editable like the columns. */
export interface Category {
  id: string;
  name: string;
  color: string;
  position: number;
}

/** One step inside a task. */
export interface Subtask {
  id: string;
  title: string;
  isDone: boolean;
  position: number;
}

/** A person a task can be assigned to. */
export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  color: string;
}

/** A card on the board. */
export interface Task {
  id: string;
  columnId: string;
  categoryId: string | null;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: Priority;
  position: number;
  subtasks: Subtask[];
  contactIds: string[];
}

/** Everything the board screen needs, delivered in one call. */
export interface BoardData {
  columns: Column[];
  categories: Category[];
  tasks: Task[];
  contacts: Contact[];
}
