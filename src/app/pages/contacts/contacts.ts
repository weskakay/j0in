import { Component, computed, inject, signal } from '@angular/core';
import { BoardStore } from '../../core/board.store';
import type { Contact, ContactInput } from '../../data/models';
import { initialsOf } from '../../data/format';
import { Dialog } from '../../layout/dialog/dialog';
import { Loader } from '../../layout/loader/loader';
import { ContactForm } from './contact-form/contact-form';

/** One letter of the alphabet with the contacts filed under it. */
export interface ContactGroup {
  letter: string;
  contacts: Contact[];
}

/** Which dialog is on screen, if any. */
type DialogMode = 'none' | 'detail' | 'edit' | 'create' | 'wipe';

/** The address book: everyone a task can be assigned to. */
@Component({
  selector: 'app-contacts',
  imports: [Dialog, Loader, ContactForm],
  templateUrl: './contacts.html',
  styleUrl: './contacts.scss',
})
export class Contacts {
  private readonly store = inject(BoardStore);

  /** True while a load is running. */
  protected readonly loading = this.store.loading;

  /** Message of a failed call, or null. */
  protected readonly error = this.store.error;

  /** Whether a board has arrived at all. */
  protected readonly ready = this.store.ready;

  /** The contacts sorted by name and filed under their first letter. */
  protected readonly groups = computed(() => groupByLetter(this.store.contacts()));

  /** How many contacts there are in total. */
  protected readonly total = computed(() => this.store.contacts().length);

  /** Which dialog is open. */
  protected readonly mode = signal<DialogMode>('none');

  /** The contact the dialog is about, or null while adding. */
  protected readonly current = signal<Contact | null>(null);

  /** True while a save or delete is in flight. */
  protected readonly busy = signal(false);

  /** Heading of the open dialog. */
  protected readonly heading = computed(() => headingFor(this.mode(), this.current()));

  /** How many cards this contact is assigned to. */
  protected readonly assignedCount = computed(() => {
    const id = this.current()?.id;
    return id ? this.store.tasks().filter((task) => task.contactIds.includes(id)).length : 0;
  });

  constructor() {
    this.store.load();
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

const HEADINGS: Partial<Record<DialogMode, string>> = {
  create: 'Neuer Kontakt',
  edit: 'Kontakt bearbeiten',
  wipe: 'Kontakt löschen',
};

/** The heading the dialog carries in each of its uses. */
function headingFor(mode: DialogMode, contact: Contact | null): string {
  return HEADINGS[mode] ?? contact?.name ?? '';
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
