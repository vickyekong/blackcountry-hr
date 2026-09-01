import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  bootstrapCompany,
  TenancyError,
} from "@/lib/tenancy/bootstrap-company";
import { handleApiError } from "@/lib/api-auth";
import { isSignupEnabled } from "@/lib/env";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";

const signupSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  address: z.string().trim().max(240).optional().nullable(),
  adminName: z.string().trim().min(2).max(120),
  adminEmail: z.string().trim().email().max(180),
  adminPassword: z.string().min(8).max(128),
});

export async function GET() {
  return NextResponse.json({ enabled: isSignupEnabled() });
}

/**
 * Public tenant signup. Creates company + NTA defaults + Super Admin.
 * Demo Blackcountry Group (seed-company / *@blackcountry.africa) is untouched.
 * Closed in production unless SIGNUP_ENABLED=true.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isSignupEnabled()) {
      return NextResponse.json(
        {
          error:
            "Public signup is closed. Ask your Super Admin for an invite.",
        },
        { status: 403 }
      );
    }

    const ip = clientIp(req);
    if (!consumeRateLimit(`signup:${ip}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many signup attempts. Try again later." },
        { status: 429 }
      );
    }

    const body = signupSchema.parse(await req.json());
    const result = await bootstrapCompany({
      companyName: body.companyName,
      address: body.address,
      adminName: body.adminName,
      adminEmail: body.adminEmail,
      adminPassword: body.adminPassword,
    });

    return NextResponse.json(
      {
        company: result.company,
        admin: {
          id: result.admin.id,
          email: result.admin.email,
          name: result.admin.name,
          role: result.admin.role,
        },
        message: "Company created. Sign in to continue onboarding.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof TenancyError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return handleApiError(error);
  }
}
