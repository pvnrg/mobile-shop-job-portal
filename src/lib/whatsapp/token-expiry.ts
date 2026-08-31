export function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}
