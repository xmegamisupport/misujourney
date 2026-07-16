import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import { resolveHomePath, hasPrefixAccess } from "@/lib/nav";

const AUTH_PAGES = ["/login", "/register"];
const PROTECTED_PREFIXES = ["/customer", "/coach", "/admin", "/cms"];
const ONBOARDING_PATH = "/onboarding";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((page) => pathname.startsWith(page));
  const isOnboarding = pathname === ONBOARDING_PATH || pathname.startsWith(`${ONBOARDING_PATH}/`);

  if (!user && (isProtected || isOnboarding)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (isAuthPage || pathname === "/" || isProtected || isOnboarding)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, onboarding_completed_at, is_coach")
      .eq("id", user.id)
      .single();

    const role = profile?.role ?? "";
    const isCoach = profile?.is_coach ?? false;
    const onboarded = profile?.onboarding_completed_at != null;
    const home = profile ? resolveHomePath(role, isCoach, onboarded) : "/login";

    if (isAuthPage || pathname === "/") {
      if (pathname !== home) {
        const url = request.nextUrl.clone();
        url.pathname = home;
        return NextResponse.redirect(url);
      }
    }

    if (isProtected) {
      const matched = PROTECTED_PREFIXES.find((p) => pathname.startsWith(p));
      if (profile && matched && !hasPrefixAccess(matched, role, isCoach)) {
        const url = request.nextUrl.clone();
        url.pathname = home;
        return NextResponse.redirect(url);
      }
      // Onboarding gate applies ONLY when entering the Customer Journey area —
      // a coach-capable account is never forced through it to reach /coach.
      if (pathname.startsWith("/customer") && role === "customer" && !onboarded) {
        const url = request.nextUrl.clone();
        url.pathname = ONBOARDING_PATH;
        return NextResponse.redirect(url);
      }
    }

    if (isOnboarding) {
      if (role !== "customer") {
        const url = request.nextUrl.clone();
        url.pathname = home;
        return NextResponse.redirect(url);
      }
      if (onboarded) {
        const url = request.nextUrl.clone();
        url.pathname = "/customer";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
