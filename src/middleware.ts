import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

/** Paths (with the locale prefix stripped) reachable without a session. */
const PUBLIC = ["/login"];

/** Split a pathname like /ar/reports into its locale and the locale-free rest. */
function stripLocale(pathname: string): { locale: string; rest: string } {
  const segments = pathname.split("/");
  const maybe = segments[1];
  const isLocale = (routing.locales as readonly string[]).includes(maybe);
  const locale = isLocale ? maybe : routing.defaultLocale;
  const tail = (isLocale ? segments.slice(2) : segments.slice(1)).join("/");
  return { locale, rest: tail ? `/${tail}` : "/" };
}

/**
 * Auth + i18n middleware. Enforces the session (redirecting to the localized
 * login) and the admin permission, then hands off to next-intl for locale
 * routing. Reads the NextAuth JWT directly so it composes cleanly with i18n
 * routing instead of nesting withAuth.
 */
export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const { locale, rest } = stripLocale(pathname);

  const isPublic = PUBLIC.some((p) => rest === p || rest.startsWith(`${p}/`));
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Not signed in → localized login, preserving where they were headed.
  if (!token && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = "";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Already signed in but on the login page → send to reports.
  if (token && rest === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/reports`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Admin area requires the users:view permission.
  if (rest === "/admin" || rest.startsWith("/admin/")) {
    const perms = (token?.permissions as string[] | undefined) ?? [];
    if (!perms.includes("users:view")) {
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/reports`;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return intlMiddleware(req);
}

export const config = {
  // Run on all app routes except the auth API, Next internals, and static files.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
