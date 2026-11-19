import { createEventErrorMessage } from '../src/lib/eventErrors';

describe('createEventErrorMessage', () => {
  it('maps known RPC errors', () => {
    expect(createEventErrorMessage('INVALID_NAME')).toMatch(/1 to 60/);
    expect(createEventErrorMessage('INVALID_EVENT_DATE')).toMatch(/date/);
    expect(createEventErrorMessage('INVALID_NICKNAME')).toMatch(/30/);
    expect(createEventErrorMessage('NOT_AUTHENTICATED')).toMatch(/signed in/);
    expect(createEventErrorMessage('CODE_GENERATION_FAILED')).toMatch(/code/);
  });

  it('falls back to a generic message', () => {
    expect(createEventErrorMessage('Network request failed')).toMatch(/Could not create/);
    expect(createEventErrorMessage(undefined)).toMatch(/Could not create/);
  });
});
