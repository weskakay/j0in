import { Component, inject } from '@angular/core';
import { LanguageService } from '../../../core/language.service';
import { LookService } from '../../../core/look.service';
import { Switch } from '../../../ui/switch/switch';

/** How far one step of the slider moves the frost. */
const FROST_STEP = 5;

/** Tunes the glass look: how frosted it is and whether the bars bend the light. */
@Component({
  selector: 'app-glass-tuner',
  imports: [Switch],
  templateUrl: './glass-tuner.html',
  styleUrl: './glass-tuner.scss',
})
export class GlassTuner {
  private readonly looks = inject(LookService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = inject(LanguageService).dict;

  /** How frosted the glass is, 0 to 100. */
  protected readonly frost = this.looks.frost;

  /** Whether the bars bend the light. */
  protected readonly refract = this.looks.refract;

  /** Whether this browser can show the bending. */
  protected readonly canRefract = this.looks.canRefract;

  /** One step of the slider. */
  protected readonly step = FROST_STEP;

  /** Follows the slider while it moves, so the change shows at once. */
  protected slide(event: Event): void {
    this.looks.setFrost(Number((event.target as HTMLInputElement).value));
  }

  /** Switches the bending on or off. */
  protected toggleRefract(): void {
    this.looks.setRefract(!this.refract());
  }
}
