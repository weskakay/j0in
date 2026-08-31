import { Component, inject, input } from '@angular/core';
import { LanguageService } from '../../core/language.service';

/**
 * The waiting state of the brand: the zero starts as an open ring and turns
 * until the data is there. Nothing is ever done, that is the whole point of
 * the name, so the mark says what the tool is for while it loads.
 */
@Component({
  selector: 'app-loader',
  imports: [],
  templateUrl: './loader.html',
  styleUrl: './loader.scss',
})
export class Loader {
  private readonly language = inject(LanguageService);

  /** What is being waited for, read out to screen readers. */
  readonly label = input(this.language.dict().common.loading);
}
