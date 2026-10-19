import type { ProjectStatus } from '../models';

/** The icons a project can carry, named as the API stores them. */
export type ProjectIconName =
  | 'spark'
  | 'rocket'
  | 'phone'
  | 'brush'
  | 'code'
  | 'chart'
  | 'book'
  | 'flag'
  | 'heart'
  | 'globe'
  | 'box'
  | 'star';

/**
 * The wording of the pages added in the second round: projects, calendar,
 * team, the sections of the settings and the owner's notifications.
 */
export interface PageTexts {
  projects: {
    title: string;
    activeWord: string;
    shippedWord: string;
    kpiActive: string;
    kpiShipped: string;
    kpiOnTrack: string;
    kpiDueMonth: string;
    filterLabel: string;
    all: string;
    status: Record<ProjectStatus, string>;
    statusLabel: string;
    create: string;
    edit: string;
    remove: string;
    confirmRemove: string;
    pin: string;
    pinned: string;
    milestone: string;
    noMilestone: string;
    tasksWord: string;
    noDue: string;
    empty: string;
    toBoard: string;
    name: string;
    nameMissing: string;
    color: string;
    icon: string;
    description: string;
    descriptionTooLong: string;
    dueDate: string;
    save: string;
    add: string;
    icons: Record<ProjectIconName, string>;
  };
  calendar: {
    title: string;
    weekEntries: string;
    previous: string;
    next: string;
    today: string;
    month: string;
    week: string;
    agenda: string;
    agendaEmpty: string;
    more: string;
    due: string;
    allDay: string;
    now: string;
    connectHint: string;
    unplanned: string;
    unplannedEmpty: string;
    dropHint: string;
  };
  team: {
    title: string;
    peopleWord: string;
    kpiPeople: string;
    kpiFocus: string;
    kpiLoad: string;
    cards: string;
    list: string;
    load: string;
    hoursOf: string;
    openTasks: string;
    profile: string;
    mail: string;
    email: string;
    phone: string;
    none: string;
    openList: string;
    doneWeek: string;
    edit: string;
  };
  prefs: {
    nav: string;
    look: string;
    board: string;
    time: string;
    focus: string;
    calendar: string;
    access: string;
    account: string;
    focusNote: string;
    focusDefault: string;
    focusGoal: string;
    focusGoalNote: string;
    capacity: string;
    capacityNote: string;
    less: string;
    more: string;
    hours: string;
    saved: string;
  };
  notices: {
    title: string;
    empty: string;
    open: string;
    requested: string;
  };
}
