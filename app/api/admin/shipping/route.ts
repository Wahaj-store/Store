import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const egyptianGovernorates = [
  "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "الشرقية", 
  "المنوفية", "القليوبية", "الغربية", "البحيرة", "كفر الشيخ", 
  "دمياط", "بورسعيد", "الإسماعيلية", "السويس", "الفيوم", 
  "بني سويف", "المنيا", "أسيوط", "سوهاج", "قنا", 
  "أسوان", "الأقصر", "البحر الأحمر", "الوادي الجديد", "مطروح", 
  "شمال سيناء", "جنوب سيناء"
];

async function ensureGovernoratesExist() {
  try {
    for (const gov of egyptianGovernorates) {
      const existing = await prisma.shippingZone.findFirst({
        where: { governorate: gov },
      });

      if (!existing) {
        await prisma.shippingZone.create({
          data: {
            governorate: gov,
            price: 60,
            active: true,
          },
        });
      }
    }
  } catch (err) {
    console.error("Error seeding governorates:", err);
  }
}

export async function GET() {
  try {
    await ensureGovernoratesExist();
    const zones = await prisma.shippingZone.findMany({
      orderBy: { governorate: "asc" },
    });
    return NextResponse.json(zones);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { governorate, price, freeAbove } = body;

    if (!governorate || price === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const newZone = await prisma.shippingZone.create({
      data: {
        governorate,
        price: parseFloat(price),
        freeAbove: freeAbove ? parseFloat(freeAbove) : null,
        active: true,
      },
    });

    return NextResponse.json(newZone, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, price, freeAbove } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const updated = await prisma.shippingZone.update({
      where: { id },
      data: {
        price: price !== undefined ? parseFloat(price) : undefined,
        freeAbove: freeAbove !== "" && freeAbove !== null ? parseFloat(freeAbove) : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    await prisma.shippingZone.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
