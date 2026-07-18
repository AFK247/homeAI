import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

/*
 * Edge guard for /admin. A cheap cookie check (no DB) — if there's no session cookie at
 * all, bounce to login with a `?next=` return path. The full role=admin check happens in
 * the admin layout (server component, DB-backed), since middleware can't read the role.
 */
export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
