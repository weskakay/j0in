import { Component, input, output } from '@angular/core';

/**
 * An on and off switch with a label and a line about it, the whole row one
 * button so it is easy to hit. Screen readers hear a switch and its state.
 */
@Component({
  selector: 'app-switch',
  templateUrl: './switch.html',
  styleUrl: './switch.scss',
})
export class Switch {
  /** What the switch turns on. */
  readonly label = input.required<string>();

  /** A line about it. */
  readonly note = input('');

  /** Whether it is on. */
  readonly on = input(false);

  /** The word for on and the word for off, shown at the end of the row. */
  readonly states = input<[string, string]>(['', '']);

  /** True while a change is on its way. */
  readonly disabled = input(false);

  /** Fires when the switch is pressed. */
  readonly toggled = output<void>();
}
