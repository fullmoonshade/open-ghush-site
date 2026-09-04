import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GhushSite has no admin panel, login system, or CMS backend — every path
 * below is scanner noise probing for endpoints that were never built here.
 * Rejecting them here, before Next.js resolves routing or renders a 404
 * page, is cheaper than letting them fall through to the app, and closes
 * the door permanently even if a route matching one of these names is ever
 * added by accident later.
 */
const SENSITIVE_PATH_PATTERN =
  /(^|\/)(wp-admin|wp-login\.php|wp-json|xmlrpc\.php|phpmyadmin|pma|admin(istrator)?|administratpr|owner|login|signin|reload|\.env|\.git|\.aws|config\.php|vendor)(\/|$|\.php$)/i;

export function proxy(request: NextRequest) {
  if (SENSITIVE_PATH_PATTERN.test(request.nextUrl.pathname)) {
    return new NextResponse(null, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|opengraph-image|twitter-image|robots.txt|sitemap.xml).*)",
  ],
};
