import { bytesToBase64 } from '../src/lib/base64';

const enc = (s: string) => bytesToBase64(new TextEncoder().encode(s));

describe('bytesToBase64', () => {
  it('matches the standard encoding for all padding lengths', () => {
    expect(enc('')).toBe('');
    expect(enc('f')).toBe('Zg==');
    expect(enc('fo')).toBe('Zm8=');
    expect(enc('foo')).toBe('Zm9v');
    expect(enc('foobar')).toBe('Zm9vYmFy');
  });

  it('handles bytes above 127', () => {
    expect(bytesToBase64(new Uint8Array([255, 216, 255]))).toBe('/9j/');
  });
});
