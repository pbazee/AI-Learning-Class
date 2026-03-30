import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const redirectTo = req.nextUrl.searchParams.get("redirect") || "/";

  if (!code) {
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  try {
    const affiliate = await prisma.affiliate.findUnique({ where: { affiliateCode: code } });

    const res = NextResponse.redirect(new URL(redirectTo, req.url));

    if (affiliate && affiliate.status === "active") {
      await prisma.affiliate.update({
        where: { id: affiliate.id },
        data: { totalClicks: { increment: 1 } },
      });

      const program = await prisma.affiliateProgram.findFirst();
      const cookieDays = program?.cookieDays ?? 30;

      res.cookies.set("aff_code", code, {
        maxAge: cookieDays * 86400,
        httpOnly: false,
        path: "/",
        sameSite: "lax",
      });
    }

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }
}
