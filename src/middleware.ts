import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

function isStaffAppPath(pathname: string) {
  return (
    pathname === "/staff" ||
    pathname.startsWith("/staff/") ||
    pathname === "/my" ||
    pathname.startsWith("/my/")
  );
}

function isFinanceAppPath(pathname: string) {
  return pathname === "/finance" || pathname.startsWith("/finance/");
}

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;
    const staffApp = isStaffAppPath(path);
    const financeApp = isFinanceAppPath(path);

    if (role === "EMPLOYEE") {
      if (!staffApp) {
        return NextResponse.redirect(new URL("/staff", req.url));
      }
      return NextResponse.next();
    }

    if (role === "FINANCE") {
      if (!financeApp) {
        return NextResponse.redirect(new URL("/finance", req.url));
      }
      return NextResponse.next();
    }

    if (staffApp) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (financeApp) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/dashboard",
    "/employees/:path*",
    "/payroll/:path*",
    "/leave/:path*",
    "/reports/:path*",
    "/audit-log/:path*",
    "/hr-desk/:path*",
    "/hr-ask/:path*",
    "/my/:path*",
    "/my",
    "/staff/:path*",
    "/staff",
    "/settings/:path*",
    "/attendance/:path*",
    "/attendance",
    "/onboarding",
    "/onboarding/:path*",
    "/finance/:path*",
    "/finance",
    "/timesheets/:path*",
    "/timesheets",
    "/projects/:path*",
    "/projects",
    "/files/:path*",
    "/files",
  ],
};
