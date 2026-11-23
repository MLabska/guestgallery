import { buildJoinUrl, parseJoinUrl } from '../src/lib/qr';

jest.mock('expo-linking', () => ({
  createURL: (path: string) => `exp://u.expo.dev/update/mocked/--/${path}`,
}));

// What Linking.createURL returns in Expo Go for a published update / the dev server.
const expoGoUpdate = (path: string) => `exp://u.expo.dev/update/0123-abcd/--/${path}`;
const expoGoDev = (path: string) => `exp://192.168.0.10:8081/--/${path}`;
const build = (path: string) => `guestgallery://${path}`;

describe('buildJoinUrl', () => {
  it('builds a deep link to join/{CODE}', () => {
    expect(buildJoinUrl('K7P4QX', build)).toBe('guestgallery://join/K7P4QX');
    expect(buildJoinUrl('K7P4QX', expoGoUpdate)).toBe(
      'exp://u.expo.dev/update/0123-abcd/--/join/K7P4QX',
    );
  });
  it('uses expo-linking by default', () => {
    expect(buildJoinUrl('K7P4QX')).toBe('exp://u.expo.dev/update/mocked/--/join/K7P4QX');
  });
});

describe('parseJoinUrl', () => {
  it('extracts the code from a guestgallery:// link', () => {
    expect(parseJoinUrl('guestgallery://join/K7P4QX')).toBe('K7P4QX');
  });
  it('extracts the code from Expo Go links', () => {
    expect(parseJoinUrl('exp://u.expo.dev/update/0123-abcd/--/join/K7P4QX')).toBe('K7P4QX');
    expect(parseJoinUrl('exp://192.168.0.10:8081/--/join/K7P4QX')).toBe('K7P4QX');
    expect(parseJoinUrl('exps://abc.exp.direct/--/join/K7P4QX')).toBe('K7P4QX');
    expect(
      parseJoinUrl('exp://u.expo.dev/proj/--/join/K7P4QX?channel-name=main&runtime-version=exposdk%3A58.0.0'),
    ).toBe('K7P4QX');
  });
  it('round-trips with buildJoinUrl', () => {
    for (const createURL of [build, expoGoUpdate, expoGoDev]) {
      expect(parseJoinUrl(buildJoinUrl('AB23CD', createURL))).toBe('AB23CD');
    }
  });
  it('tolerates surrounding whitespace', () => {
    expect(parseJoinUrl('  guestgallery://join/K7P4QX\n')).toBe('K7P4QX');
  });
  it('rejects foreign links', () => {
    expect(parseJoinUrl('https://example.com')).toBeNull();
    expect(parseJoinUrl('other://join/K7P4QX')).toBeNull();
    expect(parseJoinUrl('https://example.com/--/join/K7P4QX')).toBeNull();
    expect(parseJoinUrl('exp://u.expo.dev/update/0123/--/event/K7P4QX')).toBeNull();
    expect(parseJoinUrl('exp://u.expo.dev/update/0123/join/K7P4QX')).toBeNull();
  });
  it('rejects invalid codes', () => {
    expect(parseJoinUrl('guestgallery://join/')).toBeNull();
    expect(parseJoinUrl('guestgallery://join/K7P4Q')).toBeNull();
    expect(parseJoinUrl('guestgallery://join/K7P4Q0')).toBeNull();
    expect(parseJoinUrl('guestgallery://join/K7P4QX/extra')).toBeNull();
    expect(parseJoinUrl('exp://u.expo.dev/x/--/join/K7P4QX/extra')).toBeNull();
    expect(parseJoinUrl('exp://u.expo.dev/x/--/join/k7p4qx')).toBeNull();
  });
});
