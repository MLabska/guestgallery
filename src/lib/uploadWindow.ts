/** Uploads are open while now is strictly before uploads_close_at (DESIGN.md §4). */
export function uploadsOpen(closeAt: string | Date, now: Date = new Date()): boolean {
  const close = typeof closeAt === 'string' ? new Date(closeAt) : closeAt;
  if (Number.isNaN(close.getTime())) return false;
  return now.getTime() < close.getTime();
}
