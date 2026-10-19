import { noteInTab } from './tab-notice';

describe('noteInTab', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.title = 'J0IN';
  });

  afterEach(() => vi.useRealTimers());

  it('puts the note in front of the title and takes it out again', () => {
    noteInTab('Fokus geschafft');
    expect(document.title).toBe('✓ Fokus geschafft · J0IN');
    vi.advanceTimersByTime(6000);
    expect(document.title).toBe('J0IN');
  });

  it('does not stack a second note on the first', () => {
    noteInTab('Eins');
    noteInTab('Zwei');
    expect(document.title).toBe('✓ Zwei · J0IN');
  });
});
