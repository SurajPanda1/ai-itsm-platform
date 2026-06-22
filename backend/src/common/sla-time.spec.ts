import { describe, expect, it } from '@jest/globals';
import { calculate24x7DueDates } from './sla-time';

describe('24x7 SLA time calculation', () => {
  it('calculates response and resolution deadlines from configured minutes', () => {
    const startedAt = new Date('2026-06-22T00:00:00.000Z');
    const result = calculate24x7DueDates(startedAt, 15, 240);
    expect(result.responseDueAt.toISOString()).toBe('2026-06-22T00:15:00.000Z');
    expect(result.resolutionDueAt.toISOString()).toBe('2026-06-22T04:00:00.000Z');
  });
});
