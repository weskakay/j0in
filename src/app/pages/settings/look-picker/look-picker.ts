import { Component, computed, inject } from '@angular/core';
import { LanguageService } from '../../../core/language.service';
import { LOOKS, LookService, type Look } from '../../../core/look.service';
import { ToastService } from '../../../core/toast.service';

/** One look as the picker lists it. */
interface LookChoice {
  value: Look;
  label: string;
  note: string;
}

/** Picks the look of the app, each choice with a small preview of itself. */
@Component({
  selector: 'app-look-picker',
  templateUrl: './look-picker.html',
  styleUrl: './look-picker.scss',
})
export class LookPicker {
  private readonly looks = inject(LookService);
  private readonly toasts = inject(ToastService);
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** The look on screen. */
  protected readonly look = this.looks.look;

  /** Every look with its name and a line about it. */
  protected readonly choices = computed<LookChoice[]>(() => {
    const words = this.t().look;
    const notes: Record<Look, [string, string]> = {
      classic: [words.classic, words.classicNote],
      glass: [words.glass, words.glassNote],
    };
    return LOOKS.map((value) => ({ value, label: notes[value][0], note: notes[value][1] }));
  });

  /** Switches the look and says so. */
  protected pick(look: Look): void {
    if (look !== this.look()) {
      this.looks.set(look);
      this.toasts.show(this.t().look.saved);
    }
  }
}
