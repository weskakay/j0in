/**
 * The wording of the workspace around the board: the look, the top bar, the
 * focus pill, the command palette, the home screen, the board filters and
 * the task panel. Kept apart from the main dictionary so neither file grows
 * past what still reads well.
 */
export interface ScreenTexts {
  look: {
    title: string;
    note: string;
    classic: string;
    classicNote: string;
    glass: string;
    glassNote: string;
    saved: string;
    frost: string;
    frostNote: string;
    frostClear: string;
    frostSolid: string;
    refract: string;
    refractNote: string;
    refractElsewhere: string;
  };
  topbar: {
    search: string;
    shortcut: string;
    newTask: string;
    toLight: string;
    toDark: string;
    requests: string;
    noRequests: string;
  };
  pill: {
    focus: string;
    timer: string;
    stop: string;
    started: string;
    finished: string;
    stopped: string;
  };
  palette: {
    label: string;
    placeholder: string;
    empty: string;
    pages: string;
    actions: string;
    tasks: string;
    categories: string;
    contacts: string;
    newTask: string;
    theme: string;
    look: string;
    focus: string;
    signOut: string;
    hint: string;
  };
  home: {
    morning: string;
    day: string;
    evening: string;
    dueToday: string;
    dueTodayOne: string;
    eventsToday: string;
    doneToday: string;
    focusToday: string;
    overdue: string;
    nextAt: string;
    rings: string;
    ringsNote: string;
    ringTasks: string;
    ringFocus: string;
    ringEvents: string;
    ringSubtasks: string;
    upNext: string;
    upNextDue: string;
    upNextEmpty: string;
    minutes: string;
    inPrefix: string;
    now: string;
    open: string;
    focusTitle: string;
    focusNote: string;
    focusTask: string;
    focusStart: string;
    focusOff: string;
    mine: string;
    mineNote: string;
    mineEmpty: string;
    week: string;
    weekNote: string;
    categories: string;
    categoriesEmpty: string;
    phases: string;
    phasesEmpty: string;
    noPhase: string;
    toBoard: string;
    today: string;
    tomorrow: string;
    daysWord: string;
    late: string;
    ready: string;
    finishedSoFar: string;
    vsLastWeek: string;
    openShort: string;
    rightNow: string;
    team: string;
    time: string;
    inFocus: string;
    openTasks: string;
    free: string;
    noContacts: string;
    allTasks: string;
    seeAll: string;
  };
  insights: {
    title: string;
    sub: string;
    charts: string;
  };
  filter: {
    label: string;
    category: string;
    allCategories: string;
    priority: string;
    allPriorities: string;
    text: string;
    reset: string;
    open: string;
    dueWeek: string;
    overdue: string;
    doneWeek: string;
    view: string;
    board: string;
    list: string;
    openIn: string;
    categoriesWord: string;
  };
  list: {
    markDone: string;
    empty: string;
  };
  panel: {
    label: string;
    status: string;
    assignee: string;
    nobody: string;
    due: string;
    estimate: string;
    estimateHours: string;
    estimateInvalid: string;
    noEstimate: string;
    category: string;
    noCategory: string;
    subtaskAdd: string;
    subtaskPlaceholder: string;
    focusStart: string;
    missing: string;
  };
}
