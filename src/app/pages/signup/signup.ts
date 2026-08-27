import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

const MIN_PASSWORD = 8;

/** Registration screen. The account gets a board with starting columns. */
@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly error = signal('');
  protected readonly busy = signal(false);

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
      next: () => void this.router.navigate(['/summary']),
      error: (e: Error) => this.showError(e),
    });
  }

  /** Puts the server's message on screen and frees the button again. */
  private showError(e: Error): void {
    this.error.set(e.message);
    this.busy.set(false);
  }
}

/** Marks the group when the two password fields differ. */
function passwordsMatch(group: AbstractControl): { mismatch: true } | null {
  const password = group.get('password')?.value as string;
  const repeat = group.get('repeat')?.value as string;
  return password === repeat ? null : { mismatch: true };
}
