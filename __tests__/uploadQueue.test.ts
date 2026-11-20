import {
  createItems,
  limitSelection,
  progressLabel,
  resetFailed,
  runUploads,
  isFinished,
  type UploadItem,
} from '../src/lib/uploadQueue';

describe('selection limit', () => {
  it('keeps at most 10 photos', () => {
    const uris = Array.from({ length: 14 }, (_, i) => `file://${i}.jpg`);
    expect(limitSelection(uris)).toHaveLength(10);
    expect(createItems(uris)).toHaveLength(10);
  });
});

describe('progressLabel', () => {
  it('shows the photo being uploaded', () => {
    const items = createItems(['a', 'b', 'c']);
    items[0].status = 'done';
    items[1].status = 'done';
    items[2].status = 'uploading';
    expect(progressLabel(items)).toBe('Uploading 3 / 3');
  });

  it('summarises a finished queue with failures', () => {
    const items = createItems(['a', 'b']);
    items[0].status = 'done';
    items[1].status = 'failed';
    expect(progressLabel(items)).toBe('Uploaded 1 / 2, 1 failed');
  });
});

describe('runUploads', () => {
  it('continues after a failure and reports progress', async () => {
    const items = createItems(['a', 'b', 'c']);
    const uploadOne = jest.fn(async (item: UploadItem) => {
      if (item.uri === 'b') throw new Error('boom');
    });
    const seen: string[] = [];
    const result = await runUploads(items, uploadOne, (next) => seen.push(progressLabel(next)));
    expect(result.map((i) => i.status)).toEqual(['done', 'failed', 'done']);
    expect(result[1].error).toBe('boom');
    expect(uploadOne).toHaveBeenCalledTimes(3);
    expect(seen).toContain('Uploading 1 / 3');
    expect(isFinished(result)).toBe(true);
  });

  it('retries only the failed items', async () => {
    const first = await runUploads(
      createItems(['a', 'b']),
      async (item) => {
        if (item.uri === 'b') throw new Error('x');
      },
      () => undefined,
    );
    const uploadOne = jest.fn(async () => undefined);
    const second = await runUploads(resetFailed(first), uploadOne, () => undefined);
    expect(uploadOne).toHaveBeenCalledTimes(1);
    expect(second.map((i) => i.status)).toEqual(['done', 'done']);
  });
});
