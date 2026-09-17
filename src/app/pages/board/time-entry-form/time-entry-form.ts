import { Component, type OnInit, computed, inject, input, output, signal } from '@angular/core';
import {
  type AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import type { TimeEntry, TimeEntryInput, TimePhase } from '../../../data/models';
import { LanguageService } from '../../../core/language.service';

/** The longest entry that can be typed in, the same limit the server holds. */
const MAX_MINUTES = 24 * 60;

/** Books time by hand, or changes an entry that already exists. */
@Component({
  selector: 'app-time-entry-form',
  imports: [ReactiveFormsModule],
  templateUrl: './time-entry-form.html',
  styleUrl: './time-entry-form.scss',
})
export class TimeEntryForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** The phases to choose from. */
  readonly phases = input<TimePhase[]>([]);

  /** The entry being changed, or null when time is booked anew. */
  readonly entry = input<TimeEntry | null>(null);

  /** The phase a new entry starts on. */
  readonly phaseId = input<string | null>(null);

  /** True while the save request is running. */
  readonly saving = input(false);

  /** Fires with the collected values. */
  readonly submitted = output<TimeEntryInput>();

  /** Fires when the form is left without saving. */
  readonly cancelled = output<void>();

  /** The fields; the duration is checked as a whole across hours and minutes. */
  protected readonly form = this.fb.nonNullable.group(
    {
      phaseId: [''],
      hours: [0, [Validators.min(0), Validators.max(24)]],
      minutes: [0, [Validators.min(0), Validators.max(59)]],
      note: ['', Validators.maxLength(200)],
    },
    { validators: durationInRange },
  );

  /**
   * True once focus has left hours and minutes together. Hopping from one to
   * the other is still typing the same duration and must not raise the hint.
   */
  private readonly durationLeft = signal(false);

  /** A running entry has no duration yet, so only phase and note can change. */
  protected readonly running = computed(() => this.entry()?.running ?? false);

  /** Text of the button that saves. */
  protected readonly saveLabel = computed(() =>
    this.entry() ? this.t().common.save : this.t().time.book,
  );

  /** Inputs are only set after construction, so the form is filled here. */
  ngOnInit(): void {
    this.fillFromInputs();
  }

  /** Whether the duration hint belongs on screen: only after the duration was left. */
  protected showDurationHint(): boolean {
    return this.durationLeft() && this.form.hasError('duration');
  }

  /** Coming back to the duration puts the hint away until it is left again. */
  protected onDurationEntered(): void {
    this.durationLeft.set(false);
  }

  /** Notes that focus went somewhere outside hours and minutes. */
  protected onDurationLeft(event: FocusEvent): void {
    const row = event.currentTarget as HTMLElement;
    if (!row.contains(event.relatedTarget as Node | null)) {
      this.durationLeft.set(true);
    }
  }

  /** Hands the values up, once everything is valid. */
  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.durationLeft.set(true);
      return;
    }
    const value = this.form.getRawValue();
    this.submitted.emit({
      phaseId: value.phaseId || null,
      minutes: Number(value.hours) * 60 + Number(value.minutes),
      note: value.note.trim() || null,
    });
  }

  /** Starts the form off, either empty or from the entry being changed. */
  private fillFromInputs(): void {
    const entry = this.entry();
    const minutes = Math.round((entry?.seconds ?? 0) / 60);
    this.form.patchValue({
      phaseId: (entry ? entry.phaseId : this.phaseId()) ?? '',
      hours: Math.floor(minutes / 60),
      minutes: minutes % 60,
      note: entry?.note ?? '',
    });
    if (entry?.running) {
      this.form.controls.hours.disable();
      this.form.controls.minutes.disable();
    }
  }
}

/** Between one minute and a full day, unless the duration fields are switched off. */
function durationInRange(group: AbstractControl): ValidationErrors | null {
  const hours = group.get('hours');
  const minutes = group.get('minutes');
  if (!hours || !minutes || hours.disabled) {
    return null;
  }
  const total = Number(hours.value) * 60 + Number(minutes.value);
  return Number.isInteger(total) && total >= 1 && total <= MAX_MINUTES ? null : { duration: true };
}
