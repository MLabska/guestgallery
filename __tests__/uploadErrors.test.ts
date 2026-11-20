import {
  UPLOADS_CLOSED_MESSAGE,
  isUploadRejected,
  uploadErrorMessage,
} from '../src/lib/uploadErrors';
import { photoPaths } from '../src/lib/photoPaths';

describe('uploadErrorMessage', () => {
  it('maps an RLS rejection to the closed message', () => {
    expect(isUploadRejected('new row violates row-level security policy')).toBe(true);
    expect(uploadErrorMessage('new row violates row-level security policy')).toBe(
      UPLOADS_CLOSED_MESSAGE,
    );
    expect(uploadErrorMessage(UPLOADS_CLOSED_MESSAGE)).toBe(UPLOADS_CLOSED_MESSAGE);
  });

  it('does not treat check, foreign-key or unique violations as closed', () => {
    expect(isUploadRejected('violates foreign key constraint "photos_challenge_id_fkey"')).toBe(false);
    expect(isUploadRejected('violates check constraint "photos_path_check"')).toBe(false);
    expect(isUploadRejected('duplicate key value violates unique constraint')).toBe(false);
  });

  it('maps anything else to a retry hint', () => {
    expect(uploadErrorMessage('Network request failed')).toMatch(/try again/);
  });
});

describe('photoPaths', () => {
  it('builds lowercase paths matching the database check', () => {
    expect(photoPaths('EVT-1', 'ABC')).toEqual({ path: 'evt-1/abc.jpg', thumbPath: 'evt-1/abc_thumb.jpg' });
  });
});
