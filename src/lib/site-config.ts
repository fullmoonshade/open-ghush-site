export function configuredSiteOrigin(): string {
  const value =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("NEXT_PUBLIC_SITE_URL must use http or https.");
  }
  return url.origin;
}
