import { FIRST_HOUR, HOUR_HEIGHT, topFor } from './planner';

describe('topFor', () => {
  it('setzt die erste gezeichnete Stunde auf den oberen Rand', () => {
    expect(topFor(FIRST_HOUR * 60)).toBe(0);
  });

  it('rechnet eine Stunde in genau eine Zeilenhoehe um', () => {
    expect(topFor((FIRST_HOUR + 1) * 60)).toBe(HOUR_HEIGHT);
  });

  it('setzt eine halbe Stunde auf die halbe Zeilenhoehe', () => {
    expect(topFor(FIRST_HOUR * 60 + 30)).toBe(HOUR_HEIGHT / 2);
  });

  it('legt 07:30 knapp unter die zweite Stunde, nicht in den Nachmittag', () => {
    const top = topFor(7 * 60 + 30);
    expect(top).toBe(HOUR_HEIGHT * 1.5);
    expect(top).toBeLessThan(HOUR_HEIGHT * 2);
  });

  it('bleibt fuer den ganzen Tag streng steigend', () => {
    expect(topFor(13 * 60)).toBeGreaterThan(topFor(7 * 60));
    expect(topFor(22 * 60)).toBeGreaterThan(topFor(13 * 60));
  });
});
