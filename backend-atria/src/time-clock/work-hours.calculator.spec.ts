import { TimeClockEntryType } from '@prisma/client';
import { WorkHoursCalculator } from './work-hours.calculator';

const { IN, BREAK_START, BREAK_END, OUT } = TimeClockEntryType;

function punch(type: TimeClockEntryType, iso: string) {
  return { type, punchedAt: new Date(iso) };
}

describe('WorkHoursCalculator', () => {
  const calculator = new WorkHoursCalculator();

  describe('allowedTypes', () => {
    it('only allows clocking in when the day has not started', () => {
      expect(calculator.allowedTypes([])).toEqual([IN]);
    });

    it('allows lunch or clocking out while working', () => {
      expect(
        calculator.allowedTypes([punch(IN, '2026-10-26T12:00:00Z')]),
      ).toEqual([BREAK_START, OUT]);
    });

    it('only allows returning from lunch during the break', () => {
      expect(
        calculator.allowedTypes([
          punch(IN, '2026-10-26T12:00:00Z'),
          punch(BREAK_START, '2026-10-26T15:00:00Z'),
        ]),
      ).toEqual([BREAK_END]);
    });

    it('allows a single lunch break per day', () => {
      const afterLunch = [
        punch(IN, '2026-10-26T12:00:00Z'),
        punch(BREAK_START, '2026-10-26T15:00:00Z'),
        punch(BREAK_END, '2026-10-26T16:00:00Z'),
      ];
      expect(calculator.allowedTypes(afterLunch)).toEqual([OUT]);
      expect(
        calculator.allowedTypes([
          ...afterLunch,
          punch(OUT, '2026-10-26T18:00:00Z'),
          punch(IN, '2026-10-26T19:00:00Z'),
        ]),
      ).toEqual([OUT]);
    });

    it('allows clocking in again after clocking out', () => {
      expect(
        calculator.allowedTypes([
          punch(IN, '2026-10-26T12:00:00Z'),
          punch(OUT, '2026-10-26T15:00:00Z'),
        ]),
      ).toEqual([IN]);
    });
  });

  it('excludes the lunch break from worked time', () => {
    const [day] = calculator.summarizeByDay(
      [
        punch(IN, '2026-10-20T12:00:00Z'),
        punch(BREAK_START, '2026-10-20T15:00:00Z'),
        punch(BREAK_END, '2026-10-20T16:00:00Z'),
        punch(OUT, '2026-10-20T21:00:00Z'),
      ],
      new Date('2026-10-26T12:00:00Z'),
    );

    expect(day).toMatchObject({
      date: '2026-10-20',
      workedMinutes: 8 * 60,
      breakMinutes: 60,
      isOpen: false,
    });
  });

  it('still supports lunch registered as OUT followed by IN', () => {
    const [day] = calculator.summarizeByDay(
      [
        punch(IN, '2026-10-20T12:00:00Z'),
        punch(OUT, '2026-10-20T15:00:00Z'),
        punch(IN, '2026-10-20T16:00:00Z'),
        punch(OUT, '2026-10-20T21:00:00Z'),
      ],
      new Date('2026-10-26T12:00:00Z'),
    );

    expect(day.workedMinutes).toBe(8 * 60);
    expect(day.isOpen).toBe(false);
  });

  it('groups by São Paulo day, not UTC day', () => {
    // 01:30 UTC on the 21st is still 22:30 on the 20th in São Paulo.
    const days = calculator.summarizeByDay(
      [punch(IN, '2026-10-20T23:00:00Z'), punch(OUT, '2026-10-21T01:30:00Z')],
      new Date('2026-10-26T12:00:00Z'),
    );

    expect(days).toHaveLength(1);
    expect(days[0].date).toBe('2026-10-20');
    expect(days[0].workedMinutes).toBe(150);
  });

  it('counts an open shift until now only on the current day', () => {
    const now = new Date('2026-10-26T14:00:00Z');
    const [today, pastDay] = calculator.summarizeByDay(
      [punch(IN, '2026-10-25T12:00:00Z'), punch(IN, '2026-10-26T12:00:00Z')],
      now,
    );

    expect(today).toMatchObject({ date: '2026-10-26', isOpen: true });
    expect(today.workedMinutes).toBe(120);
    expect(pastDay).toMatchObject({
      date: '2026-10-25',
      isOpen: true,
      workedMinutes: 0,
    });
  });

  it('counts an ongoing lunch as break time on the current day', () => {
    const [today] = calculator.summarizeByDay(
      [
        punch(IN, '2026-10-26T12:00:00Z'),
        punch(BREAK_START, '2026-10-26T15:00:00Z'),
      ],
      new Date('2026-10-26T15:30:00Z'),
    );

    expect(today).toMatchObject({
      workedMinutes: 180,
      breakMinutes: 30,
      isOpen: true,
    });
  });
});
