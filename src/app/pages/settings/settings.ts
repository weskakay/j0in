import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

/** Placeholder for the settings screen; filled in a later stage. */
@Component({
  selector: 'app-settings',
  imports: [],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** The signed-in user, shown while the real screens are being built. */
  protected readonly user = this.auth.user;

  /** Ends the session and returns to the sign-in screen. */
  protected signOut(): void {
    this.auth.signOut().subscribe(() => void this.router.navigate(['/login']));
  }
}
