import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LookService } from './core/look.service';
import { ThemeService } from './core/theme.service';

/** Application shell. Every screen is reached through the router. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor() {
    // Both put their stored choice on the page as they are created, so the
    // sign-in screen already wears the right theme and look.
    inject(ThemeService);
    inject(LookService);
  }
}
