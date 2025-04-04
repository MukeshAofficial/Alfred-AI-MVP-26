import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/guest/register", "/admin/pre-register", "/vendor/pre-register"]
  const isPublicRoute =
    publicRoutes.some((route) => req.nextUrl.pathname === route) ||
    req.nextUrl.pathname.startsWith("/services") ||
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.startsWith("/api")

  // If user is not signed in and the current path is not a public route,
  // redirect the user to /login
  if (!session && !isPublicRoute) {
    console.log("No session found, redirecting to login from:", req.nextUrl.pathname);
    const redirectUrl = new URL("/login", req.url)
    redirectUrl.searchParams.set("redirectedFrom", req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is signed in, check their role for protected routes
  if (session) {
    // Log the current path to help with debugging
    console.log("User is authenticated, current path:", req.nextUrl.pathname);
    
    const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", session.user.id).single()

    // If error or no profile found, redirect to login
    if (error || !profile) {
      console.error("Error fetching profile in middleware:", error);
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL("/login", req.url))
    }
    
    console.log("User role in middleware:", profile.role);

    // Protect admin routes
    if (
      req.nextUrl.pathname.startsWith("/admin") &&
      !req.nextUrl.pathname.startsWith("/admin/pre-register") &&
      profile.role !== "admin"
    ) {
      console.log("Access denied to admin route for non-admin user (role:", profile.role, ")");
      return NextResponse.redirect(new URL("/403", req.url))
    }

    // Protect vendor routes
    if (
      req.nextUrl.pathname.startsWith("/vendor") &&
      !req.nextUrl.pathname.startsWith("/vendor/pre-register") &&
      profile.role !== "vendor"
    ) {
      console.log("Access denied to vendor route for non-vendor user (role:", profile.role, ")");
      return NextResponse.redirect(new URL("/403", req.url))
    }

    // Redirect to appropriate dashboard if user is already logged in and tries to access login/register pages
    if (
      req.nextUrl.pathname === "/login" ||
      req.nextUrl.pathname === "/guest/register" ||
      req.nextUrl.pathname === "/admin/pre-register" ||
      req.nextUrl.pathname === "/vendor/pre-register"
    ) {
      console.log("User already logged in, redirecting based on role:", profile.role);
      
      let redirectPath;
      switch (profile.role) {
        case "guest":
          redirectPath = "/explore";
          break;
        case "admin":
          redirectPath = "/admin/dashboard";
          break;
        case "vendor":
          redirectPath = "/vendor/dashboard";
          break;
        default:
          redirectPath = "/";
          break;
      }
      
      console.log("Redirecting to:", redirectPath);
      return NextResponse.redirect(new URL(redirectPath, req.url))
    }

    // If admin tries to access guest routes
    if (profile.role === "admin" && (
      req.nextUrl.pathname === "/explore" || 
      req.nextUrl.pathname === "/"
    )) {
      console.log("Admin user trying to access guest route, redirecting to admin dashboard");
      return NextResponse.redirect(new URL("/admin/dashboard", req.url))
    }
    
    // If vendor tries to access guest routes
    if (profile.role === "vendor" && (
      req.nextUrl.pathname === "/explore" || 
      req.nextUrl.pathname === "/"
    )) {
      console.log("Vendor user trying to access guest route, redirecting to vendor dashboard");
      return NextResponse.redirect(new URL("/vendor/dashboard", req.url))
    }
  }

  return res
}

export const config = {
  // Only run the middleware on the following paths
  matcher: [
    '/',
    '/login',
    '/explore',
    '/admin/:path*',
    '/vendor/:path*',
    '/guest/:path*',
    '/profile/:path*',
    '/services/:path*',
    '/403',
  ],
}

