export function getLogoUrl(logoPath: string | null | undefined) {
  return logoPath ? `/api/logo/${logoPath}` : null;
}
