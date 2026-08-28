import { Component, type OnInit, computed, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Contact, ContactInput } from '../../../data/models';

/** Collects a contact's details, for adding as well as editing. */
@Component({
  selector: 'app-contact-form',
  imports: [ReactiveFormsModule],
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.scss',
})
export class ContactForm implements OnInit {
  private readonly fb = inject(FormBuilder);

  /** The contact being edited, or null when a new one is added. */
  readonly contact = input<Contact | null>(null);

  /** True while the save request is running. */
  readonly saving = input(false);

  /** Fires with the collected values. */
  readonly submitted = output<ContactInput>();

  /** Fires when the visitor backs out. */
  readonly cancelled = output<void>();

  /** The fields the form validates. */
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', Validators.email],
    phone: [''],
  });

  /** Text of the saving button, which differs between the two uses. */
  protected readonly saveLabel = computed(() => (this.contact() ? 'Speichern' : 'Anlegen'));

  /** Inputs are only set after construction, so the form is filled here. */
  ngOnInit(): void {
    const contact = this.contact();
    this.form.patchValue({
      name: contact?.name ?? '',
      email: contact?.email ?? '',
      phone: contact?.phone ?? '',
    });
  }

  /** Validates, then hands the values up. */
  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.submitted.emit({
      name: value.name.trim(),
      email: value.email.trim() || null,
      phone: value.phone.trim() || null,
    });
  }
}
