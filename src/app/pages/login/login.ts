import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { Observable } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import type { User } from '../../data/models';

/** Sign-in screen with email, password and a one-click guest entrance. */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  /** Server-side error, shown above the form. */
  /** Why the last attempt was turned down, worded for the screen. */
  protected readonly error = signal('');

  /** True while a request runs; the buttons stay disabled meanwhile. */
  protected readonly busy = signal(false);

  /** The sign-in form, with the address, the password and the stay-in tick. */
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    remember: [false],
  });

  /** True when the field was touched and is invalid. */
  protected invalid(name: 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }

  /** Signs in, or shows what the server objected to. */
  protected submit(): void {
    if (this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }
    this.run(this.auth.signIn(this.form.getRawValue()));
  }

  /** Enters as the shared guest, no input required. */
  protected enterAsGuest(): void {
    if (!this.busy()) {
      this.run(this.auth.signInAsGuest());
    }
  }

  /** Shared handling for both entrances. */
  private run(request: Observable<User>): void {
    this.busy.set(true);
    this.error.set('');
    request.subscribe({
      next: () => void this.router.navigate(['/summary']),
      error: (e: Error) => this.showError(e),
    });
  }

  /** Puts the server's message on screen and frees the buttons again. */
  private showError(e: Error): void {
    this.error.set(e.message);
    this.busy.set(false);
  }
}
