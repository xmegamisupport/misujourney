import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

const ROLE_HOME: Record<string, string> = {
  customer: "/customer",
  coach: "/coach",
  admin: "/admin",
};

const AUTH_PAGES = ["/login", "/register"];
const PROTECTED_PREFIXES = ["/customer", "/coach", "/admin"];
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
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
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
      .select("role, onboarding_completed_at")
      .eq("id", user.id)
      .single();

    const home = (profile && ROLE_HOME[profile.role]) || "/login";

    if (isAuthPage || pathname === "/") {
      if (pathname !== home) {
        const url = request.nextUrl.clone();
        url.pathname = home;
        return NextResponse.redirect(url);
      }
    }

    if (isProtected) {
      const roleForPrefix = PROTECTED_PREFIXES.find((prefix) => pathname.startsWith(prefix))?.slice(1);
      if (profile && profile.role !== roleForPrefix) {
        const url = request.nextUrl.clone();
        url.pathname = ROLE_HOME[profile.role] ?? "/login";
        return NextResponse.redirect(url);
      }
      if (profile?.role === "customer" && !profile.onboarding_completed_at) {
        const url = request.nextUrl.clone();
        url.pathname = ONBOARDING_PATH;
        return NextResponse.redirect(url);
      }
    }

    if (isOnboarding) {
      if (profile?.role !== "customer") {
        const url = request.nextUrl.clone();
        url.pathname = home;
        return NextResponse.redirect(url);
      }
      if (profile.onboarding_completed_at) {
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
