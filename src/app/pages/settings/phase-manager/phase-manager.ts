import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { LanguageService } from '../../../core/language.service';
import type { TimePhase } from '../../../data/models';

/** A changed name for a phase that already exists. */
export interface PhaseEdit {
  id: string;
  name: string;
}

/** Lists the phases time is booked on and lets them be added, renamed and removed. */
@Component({
  selector: 'app-phase-manager',
  imports: [NgTemplateOutlet],
  templateUrl: './phase-manager.html',
  styleUrl: './phase-manager.scss',
})
export class PhaseManager {
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** The phases of the board, in their stored order. */
  readonly phases = input<TimePhase[]>([]);

  /** True while a request is running. */
  readonly busy = input(false);

  /** Fires with the name of a new phase. */
  readonly created = output<string>();

  /** Fires with the new name of an existing phase. */
  readonly edited = output<PhaseEdit>();

  /** Fires when a phase should be removed. */
  readonly removed = output<TimePhase>();

  /** Id of the phase being renamed, "new" while adding, or empty. */
  protected readonly editing = signal('');

  /** The name currently typed into whichever form is open. */
  protected readonly draftName = signal('');

  /** Opens the field for a new phase, or for renaming one. */
  protected start(phase: TimePhase | null): void {
    this.draftName.set(phase?.name ?? '');
    this.editing.set(phase?.id ?? 'new');
  }

  /** Closes the open field without saving. */
  protected cancel(): void {
    this.editing.set('');
  }

  /** Remembers what was typed. */
  protected onName(event: Event): void {
    this.draftName.set((event.target as HTMLInputElement).value);
  }

  /** Hands the name up, unless it is empty. */
  protected save(): void {
    const name = this.draftName().trim();
    const id = this.editing();
    if (name === '') {
      return;
    }
    if (id === 'new') {
      this.created.emit(name);
    } else {
      this.edited.emit({ id, name });
    }
    this.cancel();
  }
}
