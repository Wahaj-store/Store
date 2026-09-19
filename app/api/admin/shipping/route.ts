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

// دالة لضمان وجود المحافظات وتنظيف أي تكرارات قديمة في القاعدة
async function ensureGovernoratesExistAndCleanDuplicates() {
  try {
    // 1. تنظيف التكرارات الموجودة حالياً
    for (const gov of egyptianGovernorates) {
      const records = await prisma.shippingZone.findMany({
        where: { governorate: gov },
        orderBy: { price: "asc" }
      });
      
      // إذا وُجد أكثر من سجل لنفس المحافظة، نحتفظ بالأول ونحذف الباقي
      if (records.length > 1) {
        for (let i = 1; i < records.length; i++) {
          await prisma.shippingZone.delete({
            where: { id: records[i].id }
          });
        }
      }
    }

    // 2. إضافة أي محافظة ناقصة
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
    console.error("Error managing governorates:", err);
  }
}

export async function GET() {
  try {
    await ensureGovernoratesExistAndCleanDuplicates();
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
