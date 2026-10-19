import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutService } from '../../core/layout.service';
import { PaletteService } from '../../core/palette.service';
import { Palette } from '../palette/palette';
import { Sidebar } from '../sidebar/sidebar';
import { Topbar } from '../topbar/topbar';

/**
 * Frame around every signed-in screen: the navigation, the top bar with the
 * focus pill, and the command palette on top when it is called up.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Sidebar, Topbar, Palette],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class Shell {
  private readonly layout = inject(LayoutService);
  private readonly palette = inject(PaletteService);

  /** True while the side navigation shows icons only. */
  protected readonly navFolded = this.layout.navFolded;

  /** Whether the command palette is on screen. */
  protected readonly paletteOpen = this.palette.open;

  /** The page stays put behind the open palette instead of scrolling along. */
  private readonly lockScroll = effect((onCleanup) => {
    document.body.style.overflow = this.paletteOpen() ? 'hidden' : '';
    onCleanup(() => (document.body.style.overflow = ''));
  });

  /** Ctrl K or Cmd K opens the palette from anywhere. */
  protected onKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.palette.toggle();
    }
  }
}
