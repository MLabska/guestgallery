import { randomUUID } from 'expo-crypto';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'react-native';

import { longEdgeResize } from '../lib/imageSize';
import { photoPaths } from '../lib/photoPaths';
import { supabase } from '../lib/supabase';
import { uploadErrorMessage } from '../lib/uploadErrors';

const BUCKET = 'event-photos';
export const FULL_MAX_EDGE = 1600;
export const FULL_QUALITY = 0.7;
export const THUMB_MAX_EDGE = 400;
export const THUMB_QUALITY = 0.6;

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

async function resizeToJpeg(
  uri: string,
  source: { width: number; height: number },
  maxEdge: number,
  quality: number,
): Promise<{ uri: string; width: number; height: number }> {
  const resize = longEdgeResize(source.width, source.height, maxEdge);
  const result = await manipulateAsync(uri, resize ? [{ resize }] : [], {
    compress: quality,
    format: SaveFormat.JPEG,
  });
  return { uri: result.uri, width: result.width, height: result.height };
}

async function toArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  return response.arrayBuffer();
}

async function uploadFile(path: string, localUri: string): Promise<void> {
  const body = await toArrayBuffer(localUri);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(uploadErrorMessage(error.message));
}

/**
 * Compress, upload full image and thumbnail, then insert the photos row (DESIGN.md §5).
 * If the insert fails the uploaded files are removed again. Returns the new photo id.
 */
export async function uploadPhoto(params: {
  eventId: string;
  userId: string;
  uri: string;
  challengeId?: string | null;
}): Promise<string> {
  const { eventId, userId, uri, challengeId } = params;
  const photoId = randomUUID().toLowerCase();
  const { path, thumbPath } = photoPaths(eventId, photoId);

  const source = await getImageSize(uri);
  const full = await resizeToJpeg(uri, source, FULL_MAX_EDGE, FULL_QUALITY);
  const thumb = await resizeToJpeg(uri, source, THUMB_MAX_EDGE, THUMB_QUALITY);

  const uploaded: string[] = [];
  try {
    await uploadFile(path, full.uri);
    uploaded.push(path);
    await uploadFile(thumbPath, thumb.uri);
    uploaded.push(thumbPath);

    const { error } = await supabase.from('photos').insert({
      id: photoId,
      event_id: eventId,
      uploader_id: userId,
      challenge_id: challengeId ?? null,
      path,
      thumb_path: thumbPath,
      width: full.width,
      height: full.height,
    });
    if (error) throw new Error(uploadErrorMessage(error.message));
  } catch (e) {
    if (uploaded.length > 0) {
      // Best effort: a failed cleanup must not hide the original error.
      await supabase.storage
        .from(BUCKET)
        .remove(uploaded)
        .catch(() => undefined);
    }
    throw e;
  }
  return photoId;
}
