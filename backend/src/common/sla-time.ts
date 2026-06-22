export function calculate24x7DueDates(startedAt: Date, responseMinutes: number, resolutionMinutes: number) {
  return {
    responseDueAt: new Date(startedAt.getTime() + responseMinutes * 60_000),
    resolutionDueAt: new Date(startedAt.getTime() + resolutionMinutes * 60_000),
  };
}
