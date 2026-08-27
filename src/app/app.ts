import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Application shell. Every screen is reached through the router. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
