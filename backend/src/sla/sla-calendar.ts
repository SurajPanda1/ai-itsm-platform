import { DateTime } from 'luxon';

export type WeeklySchedule = Record<string, { start: string; end: string }[]>;

export interface CalendarConfig {
  calendarType: string;
  timezone: string;
  weeklySchedule?: unknown;
  holidays?: unknown;
}

export function addSlaMinutes(start: Date, minutes: number, calendar: CalendarConfig): Date {
  if (calendar.calendarType === 'TWENTY_FOUR_SEVEN') return new Date(start.getTime() + minutes * 60_000);
  const schedule = (calendar.weeklySchedule ?? {}) as WeeklySchedule;
  const holidays = new Set(Array.isArray(calendar.holidays) ? calendar.holidays as string[] : []);
  let current = DateTime.fromJSDate(start, { zone: calendar.timezone });
  let remaining = minutes;
  for (let daysChecked = 0; daysChecked < 370 && remaining > 0; daysChecked++) {
    const dateKey = current.toFormat('yyyy-MM-dd');
    const intervals = holidays.has(dateKey) ? [] : (schedule[current.toFormat('cccc').toUpperCase()] ?? []);
    for (const interval of intervals) {
      const [startHour, startMinute] = interval.start.split(':').map(Number);
      const [endHour, endMinute] = interval.end.split(':').map(Number);
      const intervalStart = current.startOf('day').set({ hour: startHour, minute: startMinute });
      const intervalEnd = current.startOf('day').set({ hour: endHour, minute: endMinute });
      const cursor = current > intervalStart ? current : intervalStart;
      if (cursor >= intervalEnd) continue;
      const available = Math.floor(intervalEnd.diff(cursor, 'minutes').minutes);
      if (remaining <= available) return cursor.plus({ minutes: remaining }).toUTC().toJSDate();
      remaining -= available;
    }
    current = current.plus({ days: 1 }).startOf('day');
  }
  if (remaining > 0) throw new Error('SLA calendar has insufficient working time configured');
  return current.toUTC().toJSDate();
}
