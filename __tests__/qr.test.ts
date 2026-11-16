import { buildJoinUrl, parseJoinUrl } from '../src/lib/qr';

describe('buildJoinUrl', () => {
  it('builds the join link', () => {
    expect(buildJoinUrl('K7P4QX')).toBe('guestgallery://join/K7P4QX');
  });
});

describe('parseJoinUrl', () => {
  it('extracts the code', () => {
    expect(parseJoinUrl('guestgallery://join/K7P4QX')).toBe('K7P4QX');
  });
  it('round-trips with buildJoinUrl', () => {
    expect(parseJoinUrl(buildJoinUrl('AB23CD'))).toBe('AB23CD');
  });
  it('tolerates surrounding whitespace', () => {
    expect(parseJoinUrl('  guestgallery://join/K7P4QX\n')).toBe('K7P4QX');
  });
  it('rejects foreign links', () => {
    expect(parseJoinUrl('https://example.com')).toBeNull();
    expect(parseJoinUrl('other://join/K7P4QX')).toBeNull();
  });
  it('rejects invalid codes', () => {
    expect(parseJoinUrl('guestgallery://join/')).toBeNull();
    expect(parseJoinUrl('guestgallery://join/K7P4Q')).toBeNull();
    expect(parseJoinUrl('guestgallery://join/K7P4Q0')).toBeNull();
    expect(parseJoinUrl('guestgallery://join/K7P4QX/extra')).toBeNull();
  });
});
