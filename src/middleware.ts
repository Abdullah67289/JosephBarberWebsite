import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth-jwt";

/**
 * Guards every /admin route (except the login page and auth API). Unverified
 * requests are redirected to the login screen with a `next` param so they can
 * be returned to where they were headed.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLogin = pathname === "/admin/login";
  const isSignup = pathname === "/admin/signup";
  const isAuthApi = pathname.startsWith("/api/admin/auth");
  if (isLogin || isSignup || isAuthApi) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
