/** How long the note stays in the title while the tab is in view anyway. */
const VISIBLE_FOR = 6000;

/** What every note starts with, so it can be told apart from the real title. */
const MARK = '✓ ';

/** The title the page had before the note, so a second note does not stack. */
let plainTitle = '';

/** The timer that takes a note away, so a newer note is not cut short. */
let clearing: ReturnType<typeof setTimeout> | undefined;

/**
 * Puts a short note in front of the tab's title, such as a finished focus run,
 * so it shows in the tab bar while someone works elsewhere. It goes once the
 * tab is looked at again, or after a few seconds if it already is.
 */
export function noteInTab(text: string): void {
  if (!document.title.startsWith(MARK)) {
    plainTitle = document.title;
  }
  document.title = `${MARK}${text} · ${plainTitle}`;
  clearTimeout(clearing);
  if (document.visibilityState === 'visible') {
    clearing = setTimeout(restoreTitle, VISIBLE_FOR);
    return;
  }
  document.addEventListener('visibilitychange', restoreTitle, { once: true });
}

/** Takes the note out of the title again, unless something else renamed the page since. */
function restoreTitle(): void {
  if (document.title.startsWith(MARK)) {
    document.title = plainTitle;
  }
}
