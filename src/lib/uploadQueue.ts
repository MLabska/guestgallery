/** Upload queue logic (SPEC 3.2): progress, retry and sequential running. Pure and testable. */

export const MAX_PHOTOS_PER_BATCH = 10;

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'failed';

export interface UploadItem {
  key: string;
  uri: string;
  status: UploadStatus;
  error?: string;
}

/** At most 10 photos per selection (SPEC 3.2). */
export function limitSelection<T>(items: T[]): T[] {
  return items.slice(0, MAX_PHOTOS_PER_BATCH);
}

export function createItems(uris: string[]): UploadItem[] {
  return limitSelection(uris).map((uri, i) => ({ key: `${i}`, uri, status: 'pending' as const }));
}

export function countByStatus(items: UploadItem[], status: UploadStatus): number {
  return items.filter((i) => i.status === status).length;
}

/** True when nothing is pending or uploading any more. */
export function isFinished(items: UploadItem[]): boolean {
  return items.every((i) => i.status === 'done' || i.status === 'failed');
}

export function failedCount(items: UploadItem[]): number {
  return countByStatus(items, 'failed');
}

/** "Uploading 3 / 10" while running, a summary when finished. */
export function progressLabel(items: UploadItem[]): string {
  const total = items.length;
  const done = countByStatus(items, 'done');
  const failed = failedCount(items);
  if (isFinished(items)) {
    return failed > 0 ? `Uploaded ${done} / ${total}, ${failed} failed` : `Uploaded ${done} / ${total}`;
  }
  const current = Math.min(total, done + failed + 1);
  return `Uploading ${current} / ${total}`;
}

/** Puts every failed item back to pending so it can be retried. */
export function resetFailed(items: UploadItem[]): UploadItem[] {
  return items.map((i) =>
    i.status === 'failed' ? { key: i.key, uri: i.uri, status: 'pending' as const } : i,
  );
}

function update(items: UploadItem[], key: string, patch: Partial<UploadItem>): UploadItem[] {
  return items.map((i) => (i.key === key ? { ...i, ...patch } : i));
}

/**
 * Uploads all pending items one after another. A failed item does not stop the others
 * (SPEC 3.2). `onChange` receives the new list after every status change.
 */
export async function runUploads(
  items: UploadItem[],
  uploadOne: (item: UploadItem) => Promise<void>,
  onChange: (items: UploadItem[]) => void,
  toMessage: (e: unknown) => string = (e) => (e instanceof Error ? e.message : 'Upload failed'),
): Promise<UploadItem[]> {
  let current = items;
  for (const item of items) {
    if (item.status !== 'pending') continue;
    current = update(current, item.key, { status: 'uploading', error: undefined });
    onChange(current);
    try {
      await uploadOne(item);
      current = update(current, item.key, { status: 'done' });
    } catch (e) {
      current = update(current, item.key, { status: 'failed', error: toMessage(e) });
    }
    onChange(current);
  }
  return current;
}
