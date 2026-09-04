const NETWORK_ADDRESS_PATTERN = /^[0-9a-f:.]{3,64}$/i;

export function isTrustedWriteOrigin(
  request: Request,
  configuredOrigin: string | undefined,
): boolean {
  const requestUrl = new URL(request.url);
  const allowedOrigin = configuredOrigin?.trim()
    ? new URL(configuredOrigin).origin
    : requestUrl.origin;
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return (
    origin === allowedOrigin &&
    (!fetchSite || fetchSite === "same-origin")
  );
}

export function selectClientNetworkAddress(
  request: Request,
  platformAddress: string | undefined,
  trustedHeaderName: string | undefined,
): string | null {
  const headerName = trustedHeaderName?.trim().toLowerCase();
  const forwardedAddress = headerName
    ? request.headers.get(headerName)?.split(",", 1)[0]?.trim()
    : undefined;
  const address = platformAddress ?? forwardedAddress;
  return address && NETWORK_ADDRESS_PATTERN.test(address) ? address : null;
}

export function safeErrorMetadata(error: unknown): {
  errorName: string;
  code: string | null;
} {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  const rawCode =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : null;
  return {
    errorName,
    code:
      rawCode && /^[A-Za-z0-9_-]{1,40}$/.test(rawCode) ? rawCode : null,
  };
}
