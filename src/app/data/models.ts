/** Which kind of account is signed in. */
type UserRole = 'user' | 'guest' | 'owner';

/** Where a request for access stands. */
type AccessStatus = 'pending' | 'approved' | 'rejected';

/** Someone who asked to use the app, as the owner's screen shows them. */
export interface AccessRequest {
  id: string;
  name: string;
  email: string;
  status: AccessStatus;
  created_at: string;
  decided_at: string | null;
}

/** The signed-in user as the API returns it; never carries a password. */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Whether this account may reach the calendar; the server decides. */
  calendarEnabled?: boolean;
  /** Open access requests, counted only for the owner. */
  pending?: number;
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

/** What the category form collects. */
export interface CategoryInput {
  name: string;
  color: string;
}

/** One step inside a task. */
export interface Subtask {
  id: string;
  title: string;
  isDone: boolean;
  position: number;
}

/** A kind of work time is booked on, such as planning or testing. */
export interface TimePhase {
  id: string;
  name: string;
  position: number;
}

/** Time spent on a task, either finished or with the timer still running. */
export interface TimeEntry {
  id: string;
  /** Null when no phase was chosen or the phase has since been deleted. */
  phaseId: string | null;
  note: string | null;
  startedAt: string;
  running: boolean;
  /** Seconds booked; for a running entry, the seconds up to the moment the board was read. */
  seconds: number;
}

/** What the time form collects, for booking by hand as well as for editing. */
export interface TimeEntryInput {
  phaseId: string | null;
  minutes: number;
  note: string | null;
}

/** A person a task can be assigned to. */
export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  color: string;
}

/** What the contact form collects. */
export interface ContactInput {
  name: string;
  email: string | null;
  phone: string | null;
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
  timeEntries: TimeEntry[];
}

/** A subtask on its way to the server, before it has an id. */
export interface SubtaskInput {
  title: string;
  isDone: boolean;
}

/** What the task form collects, for both creating and editing. */
export interface TaskInput {
  columnId: string;
  categoryId: string | null;
  title: string;
  description: string | null;
  dueDate: string;
  priority: Priority;
  contactIds: string[];
  subtasks: SubtaskInput[];
}

/** Everything the board screen needs, delivered in one call. */
export interface BoardData {
  name: string;
  /** Whether this board offers the timer and the time log on its cards. */
  timeTracking: boolean;
  columns: Column[];
  categories: Category[];
  phases: TimePhase[];
  tasks: Task[];
  contacts: Contact[];
}
