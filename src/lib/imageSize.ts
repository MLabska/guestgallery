/**
 * Scales (width, height) so the long edge is at most `max`, keeping the aspect ratio.
 * Images already small enough are returned unchanged (never upscaled).
 */
export function fitLongEdge(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= max) return { width, height };
  const scale = max / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Resize instruction that sets only the long edge (the manipulator keeps the aspect ratio),
 * so an EXIF orientation mismatch cannot stretch the photo. Null when no downscale is needed.
 */
export function longEdgeResize(
  width: number,
  height: number,
  max: number,
): { width: number } | { height: number } | null {
  if (Math.max(width, height) <= max) return null;
  return width >= height ? { width: max } : { height: max };
}
