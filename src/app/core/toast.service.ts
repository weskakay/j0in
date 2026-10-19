import { Injectable, signal } from '@angular/core';

/** One short message, shown by the focus pill at the top of the screen. */
export interface Toast {
  id: number;
  text: string;
}

/** How long one message stays before the next one gets its turn. */
const SHOW_FOR = 3000;

/**
 * Short confirmations such as "Focus done". They queue up, so two in quick
 * succession are both read instead of the second one wiping out the first.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly queue = signal<Toast[]>([]);
  private count = 0;

  /** The message on screen right now, or null. */
  readonly current = signal<Toast | null>(null);

  /** Queues a message. */
  show(text: string): void {
    this.queue.update((list) => [...list, { id: ++this.count, text }]);
    if (!this.current()) {
      this.advance();
    }
  }

  /** Puts the next message up, or clears the focus pill when none is left. */
  private advance(): void {
    const [next, ...rest] = this.queue();
    this.queue.set(rest);
    this.current.set(next ?? null);
    if (next) {
      setTimeout(() => this.advance(), SHOW_FOR);
    }
  }
}
