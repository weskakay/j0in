import { Component, computed, inject, signal } from '@angular/core';
import { BoardStore } from '../../core/board.store';
import { LanguageService } from '../../core/language.service';
import type { Contact, ContactInput } from '../../data/models';
import type { Dictionary } from '../../data/i18n';
import { initialsOf, today } from '../../data/format';
import { presenceOf, type Presence } from '../../data/presence';
import { averageLoad, membersOf } from '../../data/team';
import { TimeTracker } from '../../core/time-tracker.service';
import { Profile } from './profile/profile';
import { TeamCard } from './team-card/team-card';
import { Dialog } from '../../layout/dialog/dialog';
import { Loader } from '../../layout/loader/loader';
import { ContactForm } from './contact-form/contact-form';

/** One letter of the alphabet with the contacts filed under it. */
interface ContactGroup {
  letter: string;
  contacts: Contact[];
}

/** Which dialog is on screen, if any. */
type DialogMode = 'none' | 'detail' | 'edit' | 'create' | 'wipe';

/** The address book: everyone a task can be assigned to. */
@Component({
  selector: 'app-contacts',
  imports: [Dialog, Loader, ContactForm, TeamCard, Profile],
  templateUrl: './contacts.html',
  styleUrl: './contacts.scss',
})
export class Contacts {
  private readonly store = inject(BoardStore);
  private readonly language = inject(LanguageService);
  private readonly tracker = inject(TimeTracker);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** True while a load is running. */
  protected readonly loading = this.store.loading;

  /** The last failure, in the language on screen. */
  protected readonly error = computed(() => this.language.message(this.store.error()));

  /** Whether a board has arrived at all. */
  protected readonly ready = this.store.ready;

  /** The contacts sorted by name and filed under their first letter. */
  protected readonly groups = computed(() => groupByLetter(this.store.contacts()));

  /** Cards or the alphabetical list. */
  protected readonly view = signal<'cards' | 'list'>('cards');

  /** The hours of a week, as set in the settings. */
  protected readonly capacity = computed(() => this.store.preferences().weekCapacity);

  /** Everyone with their open cards, load and main project. */
  protected readonly members = computed(() =>
    membersOf(this.store.contacts(), this.store.tasks(), this.store.categories(), {
      day: today(),
      lastId: this.lastId(),
      capacity: this.capacity(),
    }),
  );

  private readonly lastId = computed(() => this.store.columns().at(-1)?.id ?? null);

  /** What everyone is up to, looked up by contact. */
  private readonly presence = computed(() => {
    const running = this.tracker.running()?.taskId ?? null;
    const list = presenceOf(this.store.contacts(), this.store.tasks(), running, this.lastId());
    return new Map(list.map((entry) => [entry.contact.id, entry]));
  });

  /** How many people are in focus right now. */
  protected readonly inFocus = computed(() => [...this.presence().values()].filter((one) => one.state === 'focus').length);

  /** The average load of the team. */
  protected readonly averageLoad = computed(() => averageLoad(this.members()));

  /** The member the profile panel shows. */
  protected readonly shown = computed(() => this.members().find((one) => one.contact.id === this.current()?.id) ?? null);

  /** How many contacts there are in total. */
  protected readonly total = computed(() => this.store.contacts().length);

  /** Which dialog is open. */
  protected readonly mode = signal<DialogMode>('none');

  /** The contact the dialog is about, or null while adding. */
  protected readonly current = signal<Contact | null>(null);

  /** True while a save or delete is in flight. */
  protected readonly busy = signal(false);

  /** Heading of the open dialog. */
  protected readonly heading = computed(() => headingFor(this.mode(), this.current(), this.t()));

  /** How many cards this contact is assigned to. */
  protected readonly assignedCount = computed(() => {
    const id = this.current()?.id;
    return id ? this.store.tasks().filter((task) => task.contactIds.includes(id)).length : 0;
  });

  /** Singular or plural of "task", for the counts in the dialog. */
  protected readonly taskWord = computed(() =>
    this.assignedCount() === 1 ? this.t().contacts.taskOne : this.t().contacts.taskMany,
  );

  constructor() {
    this.store.load();
  }

  /** What one contact is up to; free when the board has not been read yet. */
  protected presenceFor(contact: Contact): Presence {
    return this.presence().get(contact.id) ?? { contact, state: 'free', open: 0, focusTitle: null };
  }

  /** Opens the form for a contact from the profile. */
  protected editFromProfile(contact: Contact): void {
    this.current.set(contact);
    this.mode.set('edit');
  }

  /** Asks before deleting a contact from the profile. */
  protected removeFromProfile(contact: Contact): void {
    this.current.set(contact);
    this.mode.set('wipe');
  }

  /** Letters on a contact's avatar. */
  protected initials(contact: Contact): string {
    return initialsOf(contact.name);
  }

  /** Opens a contact for reading. */
  protected open(contact: Contact): void {
    this.current.set(contact);
    this.mode.set('detail');
  }

  /** Opens the empty form. */
  protected openNew(): void {
    this.current.set(null);
    this.mode.set('create');
  }

  /** Switches from reading to editing. */
  protected startEdit(): void {
    this.mode.set('edit');
  }

  /** Asks once before a contact disappears. */
  protected askDelete(): void {
    this.mode.set('wipe');
  }

  /** Closes whatever dialog is open. */
  protected close(): void {
    this.mode.set('none');
    this.current.set(null);
  }

  /** Saves the form, either as a new contact or over the open one. */
  protected onSubmit(input: ContactInput): void {
    const contact = this.current();
    this.busy.set(true);
    const request = contact
      ? this.store.updateContact(contact.id, input)
      : this.store.createContact(input);
    request.subscribe({ next: () => this.finish(), error: () => this.busy.set(false) });
  }

  /** Removes the open contact. */
  protected onDelete(): void {
    const contact = this.current();
    if (!contact) {
      return;
    }
    this.busy.set(true);
    this.store.deleteContact(contact.id).subscribe({
      next: () => this.finish(),
      error: () => this.busy.set(false),
    });
  }

  /** Tries the load again after a failure. */
  protected retry(): void {
    this.store.load();
  }

  /** Leaves the dialog once a write went through. */
  private finish(): void {
    this.busy.set(false);
    this.close();
  }
}

/** The heading the dialog carries in each of its uses. */
function headingFor(mode: DialogMode, contact: Contact | null, t: Dictionary): string {
  const headings: Partial<Record<DialogMode, string>> = {
    create: t.contacts.newContact,
    edit: t.contacts.editContact,
    wipe: t.contacts.deleteContact,
  };
  return headings[mode] ?? contact?.name ?? '';
}

/** Sorts the contacts by name and files them under their first letter. */
function groupByLetter(contacts: Contact[]): ContactGroup[] {
  const sorted = [...contacts].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const groups: ContactGroup[] = [];
  for (const contact of sorted) {
    const letter = (contact.name[0] ?? '?').toUpperCase();
    const last = groups[groups.length - 1];
    if (last?.letter === letter) {
      last.contacts.push(contact);
    } else {
      groups.push({ letter, contacts: [contact] });
    }
  }
  return groups;
}
