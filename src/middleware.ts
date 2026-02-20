import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect ke login kalau belum auth
  if (!user && !request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect ke dashboard kalau sudah auth dan akses login
  if (user && request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ============================================
  // ROLE-BASED ACCESS CONTROL
  // ============================================

  // Define admin-only routes
  const adminOnlyRoutes = [
    "/dashboard/karyawan",
    "/dashboard/absensi",
    "/dashboard/shift",
    "/dashboard/cuti",
    "/dashboard/laporan",
    "/dashboard/pengaturan",
  ];

  const isAdminOnlyRoute = adminOnlyRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  // Check role for admin routes
  if (user && isAdminOnlyRoute) {
    const { data: employee } = await supabase
      .from("employees")
      .select("role")
      .eq("user_id", user.id)
      .single();

    // Redirect non-admin to dashboard with error
    if (!employee || employee.role !== "admin") {
      console.log(
        `🚫 Access denied: ${request.nextUrl.pathname} (role: ${employee?.role})`,
      );
      return NextResponse.redirect(
        new URL("/dashboard?error=admin-only", request.url),
      );
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
