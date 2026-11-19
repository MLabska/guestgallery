import { buildShareText } from '../src/lib/shareText';

describe('buildShareText', () => {
  it('contains the event name and the code', () => {
    const text = buildShareText('Anna and Tom', 'K7P4QX');
    expect(text).toContain('Anna and Tom');
    expect(text).toContain('K7P4QX');
  });
});
