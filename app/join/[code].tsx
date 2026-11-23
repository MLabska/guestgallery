import { Redirect, useLocalSearchParams } from 'expo-router';

import { isValidCode, normalizeCode } from '../../src/lib/eventCode';

// Deep link target of the invite QR code (DESIGN.md §5): .../join/{CODE}.
// Opened when the QR is scanned with the iPhone Camera app instead of the in-app
// scanner. Static routes (join/code, join/scan, join/nickname) take precedence.
export default function JoinLinkScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const code = normalizeCode(typeof params.code === 'string' ? params.code : '');

  if (!isValidCode(code)) return <Redirect href="/join/code" />;
  return <Redirect href={{ pathname: '/join/nickname', params: { code } }} />;
}
