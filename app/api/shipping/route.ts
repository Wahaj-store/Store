import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const revalidate = 60;
// Public read-only shipping data used by the storefront checkout.
// Administrative mutations remain protected under /api/admin/shipping.
export async function GET() {
  try {
    const zones = await prisma.shippingZone.findMany({
      where: { active: true },
      orderBy: [{ governorate: "asc" }, { city: "asc" }],
      select: {
        id: true,
        governorate: true,
        city: true,
        price: true,
        freeAbove: true,
        etaMinDays: true,
        etaMaxDays: true,
        active: true,
      },
    });

    return NextResponse.json(zones);
  } catch (error) {
    console.error("Public shipping API error:", error);
    return NextResponse.json({ error: "Failed to fetch shipping zones" }, { status: 500 });
  }
}
