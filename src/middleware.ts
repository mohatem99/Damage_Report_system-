import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Admin area requires the users:view permission.
    const permissions = (req.nextauth.token?.permissions as string[]) ?? [];
    if (
      req.nextUrl.pathname.startsWith("/admin") &&
      !permissions.includes("users:view")
    ) {
      return NextResponse.redirect(new URL("/reports", req.url));
    }
    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
    callbacks: {
      // Authorized when a session token exists.
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  /**
   * Protect all app routes except the auth API, login page, Next internals,
   * and static assets.
   */
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
};
