import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';

const MIN_PASSWORD = 8;

/**
 * Registration screen. Signing up files a request rather than creating a
 * usable account; the owner decides, and only then does the board appear.
 */
@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup {
  private readonly auth = inject(AuthService);
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;
  private readonly fb = inject(FormBuilder);

  /** Why the last attempt was turned down, worded for the screen. */
  protected readonly error = signal('');

  /** True while a request runs; the buttons stay disabled meanwhile. */
  protected readonly busy = signal(false);

  /** True once the request has been filed, which ends the form's job. */
  protected readonly filed = signal(false);

  /** The sign-up form; it is checked when a field is left, not while typing. */
  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD)]],
      repeat: ['', [Validators.required]],
      privacy: [false, [Validators.requiredTrue]],
    },
    { validators: passwordsMatch },
  );

  /** True when the field was touched and is invalid. */
  protected invalid(name: 'name' | 'email' | 'password' | 'privacy'): boolean {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }

  /** True once both password fields were touched and differ. */
  protected get mismatch(): boolean {
    const repeat = this.form.controls.repeat;
    return repeat.touched && this.form.hasError('mismatch');
  }

  /** Registers the account, or shows what the server objected to. */
  protected submit(): void {
    if (this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    const { name, email, password } = this.form.getRawValue();
    this.auth.signUp({ name, email, password }).subscribe({
      next: () => this.showFiled(),
      error: (e: Error) => this.showError(e),
    });
  }

  /** Replaces the form with the note that the request is waiting. */
  private showFiled(): void {
    this.busy.set(false);
    this.filed.set(true);
  }

  /** Puts the server's message on screen and frees the button again. */
  private showError(e: Error): void {
    this.error.set(this.language.message(e.message));
    this.busy.set(false);
  }
}

/** Marks the group when the two password fields differ. */
function passwordsMatch(group: AbstractControl): { mismatch: true } | null {
  const password = group.get('password')?.value as string;
  const repeat = group.get('repeat')?.value as string;
  return password === repeat ? null : { mismatch: true };
}
