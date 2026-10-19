import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { BoardStore } from '../../core/board.store';
import { LanguageService } from '../../core/language.service';
import { LookService } from '../../core/look.service';
import { PaletteService } from '../../core/palette.service';
import { ThemeService } from '../../core/theme.service';
import { TimeTracker } from '../../core/time-tracker.service';
import { paletteEntries, type PaletteCommand, type PaletteEntry, type PaletteGroup } from './palette-entries';

/** The groups in the order they are listed, for the headings. */
const GROUPS: PaletteGroup[] = ['pages', 'actions', 'tasks', 'categories', 'contacts'];

/**
 * Search and commands in one field, opened with Ctrl K or Cmd K. The arrow
 * keys pick a line, Enter carries it out, Escape closes. The list below is
 * read out through aria-activedescendant, so focus never leaves the field.
 */
@Component({
  selector: 'app-palette',
  templateUrl: './palette.html',
  styleUrl: './palette.scss',
  host: { '(keydown)': 'onKeydown($event)' },
})
export class Palette {
  private readonly palette = inject(PaletteService);
  private readonly router = inject(Router);
  private readonly store = inject(BoardStore);
  private readonly tracker = inject(TimeTracker);
  private readonly themes = inject(ThemeService);
  private readonly looks = inject(LookService);
  private readonly auth = inject(AuthService);
  private readonly language = inject(LanguageService);
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');
  private readonly opener = document.activeElement as HTMLElement | null;

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** What was typed. */
  protected readonly term = signal('');

  /** Index of the line picked with the arrow keys or the pointer. */
  protected readonly active = signal(0);

  /** The matching lines, grouped. */
  protected readonly entries = computed(() =>
    paletteEntries(
      {
        t: this.t(),
        tasks: this.store.tasks(),
        categories: this.store.categories(),
        contacts: this.store.contacts(),
        tracking: this.tracker.enabled(),
        focusMinutes: this.tracker.defaultLength(),
      },
      this.term(),
    ),
  );

  /** The groups that have at least one line, each with its heading. */
  protected readonly groups = computed(() =>
    GROUPS.map((group) => ({ group, entries: this.entries().filter((e) => e.group === group) })).filter(
      (block) => block.entries.length > 0,
    ),
  );

  /** Id of the picked line, for aria-activedescendant. */
  protected readonly activeId = computed(() => this.entries()[this.active()]?.id ?? null);

  /** Puts the cursor into the field as soon as the palette is drawn. */
  private readonly focusField = effect(() => this.field()?.nativeElement.focus());

  /** Takes what was typed and starts again at the top. */
  protected onInput(event: Event): void {
    this.term.set((event.target as HTMLInputElement).value);
    this.active.set(0);
  }

  /** The position of an entry in the whole list. */
  protected indexOf(entry: PaletteEntry): number {
    return this.entries().indexOf(entry);
  }

  /** Arrow keys pick, Enter runs, Escape closes, Tab stays inside. */
  protected onKeydown(event: KeyboardEvent): void {
    const moves: Record<string, () => void> = {
      ArrowDown: () => this.step(1),
      ArrowUp: () => this.step(-1),
      Enter: () => this.run(this.entries()[this.active()]),
      Escape: () => this.close(),
      Tab: () => this.field()?.nativeElement.focus(),
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      move();
    }
  }

  /** Moves the pick up or down, wrapping round at the ends. */
  private step(delta: number): void {
    const count = this.entries().length;
    if (count > 0) {
      this.active.update((index) => (index + delta + count) % count);
      document.getElementById(this.activeId() ?? '')?.scrollIntoView({ block: 'nearest' });
    }
  }

  /** Carries out one entry and closes the palette. */
  protected run(entry: PaletteEntry | undefined): void {
    if (!entry) {
      return;
    }
    this.palette.hide();
    this.carryOut(entry.command);
  }

  /** What each kind of command does. */
  private carryOut(command: PaletteCommand): void {
    if (command.kind === 'go') {
      void this.router.navigate(command.path, { queryParams: command.query });
    } else if (command.kind === 'theme') {
      this.themes.toggle();
    } else if (command.kind === 'look') {
      this.looks.next();
    } else if (command.kind === 'focus') {
      this.tracker.startFocus(command.taskId, this.tracker.defaultLength());
    } else {
      this.auth.leave();
    }
  }

  /** Closes without doing anything and gives focus back to where it came from. */
  protected close(): void {
    this.palette.hide();
    this.opener?.focus();
  }
}
