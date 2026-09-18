import { NextResponse } from "next/server";
import { db } from "@/lib/prisma"; // أو المسار الصحيح لملف Prisma Client الخاص بك

export async function GET() {
  try {
    const zones = await db.shippingZone.findMany({
      orderBy: { governorate: "asc" },
    });
    return NextResponse.json(zones);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch shipping zones" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { governorate, price, freeAbove } = body;

    if (!governorate || price === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newZone = await db.shippingZone.create({
      data: {
        governorate,
        price: parseFloat(price),
        freeAbove: freeAbove ? parseFloat(freeAbove) : null,
        active: true,
      },
    });

    return NextResponse.json(newZone, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create shipping zone (may already exist)" }, { status: 500 });
  }
}
