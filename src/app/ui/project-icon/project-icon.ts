import { Component, computed, input } from '@angular/core';
import { PROJECT_ICONS, isProjectIcon } from '../../data/project-icons';

/**
 * The tile a project is recognised by: its colour as a soft gradient with
 * its icon on top, or its first letter when it has no icon.
 */
@Component({
  selector: 'app-project-icon',
  templateUrl: './project-icon.html',
  styleUrl: './project-icon.scss',
  host: { '[style.--tile]': 'color()', '[class.large]': 'large()' },
})
export class ProjectIcon {
  /** The icon name as stored, or null. */
  readonly icon = input<string | null>(null);

  /** The project's colour. */
  readonly color = input.required<string>();

  /** The project's name, for the letter when there is no icon. */
  readonly name = input('');

  /** The bigger tile used on the project cards. */
  readonly large = input(false);

  /** The drawing, or null to show the letter. */
  protected readonly path = computed(() => {
    const icon = this.icon();
    return isProjectIcon(icon) ? PROJECT_ICONS[icon] : null;
  });
}
