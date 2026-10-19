import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SheenDirective } from '../sheen.directive';

/** The frame every home widget sits in: a surface with a heading and an optional link. */
@Component({
  selector: 'app-widget',
  imports: [RouterLink],
  hostDirectives: [SheenDirective],
  templateUrl: './widget.html',
  styleUrl: './widget.scss',
})
export class Widget {
  /** The heading. */
  readonly heading = input.required<string>();

  /** A line under the heading. */
  readonly note = input('');

  /** Where the link at the top right leads, if there is one. */
  readonly link = input<string | null>(null);

  /** The words of that link. */
  readonly linkText = input('');
}
