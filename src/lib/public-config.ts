export function optionalHttpsUrl(value: string | undefined): string {
  if (!value?.trim()) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}
