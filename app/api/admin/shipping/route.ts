import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/rbac";

const egyptianGovernorates = [
  "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "الشرقية", 
  "المنوفية", "القليوبية", "الغربية", "البحيرة", "كفر الشيخ", 
  "دمياط", "بورسعيد", "الإسماعيلية", "السويس", "الفيوم", 
  "بني سويف", "المنيا", "أسيوط", "سوهاج", "قنا", 
  "أسوان", "الأقصر", "البحر الأحمر", "الوادي الجديد", "مطروح", 
  "شمال سيناء", "جنوب سيناء"
];

// Ensure base governorate zones exist without deleting city-specific overrides.
async function ensureGovernoratesExist() {
  try {
    for (const gov of egyptianGovernorates) {
      const existing = await prisma.shippingZone.findFirst({
        where: { governorate: gov, city: null },
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
    console.error("Error managing governorates:", err);
  }
}

export async function GET() {
  try {
    const auth = await requirePermission("shippingRead");
    if (!auth.user) return NextResponse.json({ error: "غير مصرح" }, { status: auth.status });
    await ensureGovernoratesExist();
    const zones = await prisma.shippingZone.findMany({
      where: { city: null },
      orderBy: { governorate: "asc" },
    });
    return NextResponse.json(zones);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requirePermission("shippingWrite");
    if (!auth.user) return NextResponse.json({ error: "غير مصرح" }, { status: auth.status });
    const body = await req.json();
    const { governorate, price, freeAbove } = body;

    if (!governorate || price === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // التحقق من عدم وجودها مسبقاً لمنع التكرار
    const existing = await prisma.shippingZone.findFirst({
      where: { governorate },
    });

    if (existing) {
      return NextResponse.json({ error: "Governorate already exists" }, { status: 400 });
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
    const auth = await requirePermission("shippingWrite");
    if (!auth.user) return NextResponse.json({ error: "غير مصرح" }, { status: auth.status });
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
    const auth = await requirePermission("shippingWrite");
    if (!auth.user) return NextResponse.json({ error: "غير مصرح" }, { status: auth.status });
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    // دعم إضافي لاستخراج الـ id إذا تم إرساله في الـ Body أيضاً لتجنب مشاكل Missing ID
    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch (e) {}
    }

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
