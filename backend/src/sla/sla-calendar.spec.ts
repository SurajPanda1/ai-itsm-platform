import { describe, expect, it } from '@jest/globals';
import { addSlaMinutes } from './sla-calendar';

describe('SLA business calendar', () => {
  it('adds elapsed time for a 24x7 calendar', () => {
    expect(addSlaMinutes(new Date('2026-06-22T00:00:00Z'), 60, { calendarType: 'TWENTY_FOUR_SEVEN', timezone: 'UTC' }).toISOString()).toBe('2026-06-22T01:00:00.000Z');
  });
  it('carries business minutes into the next working day', () => {
    const schedule = { MONDAY: [{ start: '09:00', end: '17:00' }], TUESDAY: [{ start: '09:00', end: '17:00' }] };
    expect(addSlaMinutes(new Date('2026-06-22T16:30:00Z'), 90, { calendarType: 'BUSINESS_HOURS', timezone: 'UTC', weeklySchedule: schedule }).toISOString()).toBe('2026-06-23T10:00:00.000Z');
  });
  it('skips configured holidays', () => {
    const schedule = { MONDAY: [{ start: '09:00', end: '17:00' }], TUESDAY: [{ start: '09:00', end: '17:00' }] };
    expect(addSlaMinutes(new Date('2026-06-22T16:30:00Z'), 60, { calendarType: 'BUSINESS_HOURS', timezone: 'UTC', weeklySchedule: schedule, holidays: ['2026-06-23'] }).toISOString()).toBe('2026-06-29T09:30:00.000Z');
  });
});
