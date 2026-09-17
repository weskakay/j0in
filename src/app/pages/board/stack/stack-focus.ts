/**
 * Puts the keyboard on one card. The id goes through a comparison rather
 * than into a selector, so an id with an odd character cannot break it.
 */
export function focusCard(id: string): void {
  for (const card of Array.from(document.querySelectorAll<HTMLElement>('li[data-task-id]'))) {
    if (card.dataset['taskId'] === id) {
      card.querySelector<HTMLElement>('button')?.focus();
      return;
    }
  }
}

/** Whether the keyboard currently sits on a card inside the given list. */
export function holdsFocus(list: Element | null): boolean {
  return !!list && !!document.activeElement && list.contains(document.activeElement);
}
