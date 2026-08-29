import { Component, input, output } from '@angular/core';
import { SWATCHES } from '../../data/palette';

/** A row of colour choices, one of which is the current one. */
@Component({
  selector: 'app-color-picker',
  imports: [],
  templateUrl: './color-picker.html',
  styleUrl: './color-picker.scss',
})
export class ColorPicker {
  /** Text above the row, read out as the group's name. */
  readonly caption = input('Farbe');

  /** The colour that is currently picked. */
  readonly value = input('');

  /** Fires with the colour that was picked. */
  readonly picked = output<string>();

  /** The colours on offer. */
  protected readonly swatches = SWATCHES;
}
