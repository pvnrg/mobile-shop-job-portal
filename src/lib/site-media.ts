export function getSiteMediaUrl(mediaPath: string | null | undefined) {
  return mediaPath ? `/api/site-media/${mediaPath}` : null;
}
