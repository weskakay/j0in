import { Component, computed, input, output } from '@angular/core';
import { isHexColor } from '../../data/accent';
import { DEFAULT_SWATCH, SWATCHES, isKnownSwatch } from '../../data/palette';

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

  /**
   * Name of an extra choice that opens the system's colour picker. Left
   * empty, the row offers the fixed colours only.
   */
  readonly customLabel = input('');

  /** The colours on offer. */
  protected readonly swatches = SWATCHES;

  /** Whether the current colour is one picked freely. */
  protected readonly custom = computed(() => this.value() !== '' && !isKnownSwatch(this.value()));

  /** What the system picker opens on: the free colour, or the first of ours. */
  protected readonly customStart = computed(() => (this.custom() ? this.value() : DEFAULT_SWATCH));

  /** Passes on a colour from the system picker once it is chosen. */
  protected pickCustom(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (isHexColor(value)) {
      this.picked.emit(value);
    }
  }
}
