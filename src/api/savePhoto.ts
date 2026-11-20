import * as ImageManipulator from 'expo-image-manipulator';
// The stable (legacy) API of SDK 58 has saveToLibraryAsync.
import * as MediaLibrary from 'expo-media-library/legacy';

import { bytesToBase64 } from '../lib/base64';

export type SaveResult = 'saved' | 'denied';

/**
 * Saves a photo to the phone's photo library (SPEC 4.3). Asks for add-only permission the
 * first time. The file is downloaded through a signed URL; expo-image-manipulator turns the
 * bytes into a local JPEG file (it accepts base64 data URIs), because only the libraries from
 * DESIGN.md section 8 are used. Throws when the download or save fails.
 */
export async function savePhotoToLibrary(signedUrl: string): Promise<SaveResult> {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) return 'denied';

  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error('Download failed');
  const bytes = new Uint8Array(await response.arrayBuffer());
  const local = await ImageManipulator.manipulateAsync(
    `data:image/jpeg;base64,${bytesToBase64(bytes)}`,
    [],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
  );
  await MediaLibrary.saveToLibraryAsync(local.uri);
  return 'saved';
}
