import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

/** Placeholder for the board screen; filled in a later stage. */
@Component({
  selector: 'app-board',
  imports: [],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** The signed-in user, shown while the real screens are being built. */
  protected readonly user = this.auth.user;

  /** Ends the session and returns to the sign-in screen. */
  protected signOut(): void {
    this.auth.signOut().subscribe(() => void this.router.navigate(['/login']));
  }
}
