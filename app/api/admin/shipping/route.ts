import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// جلب كل المحافظات
export async function GET() {
  try {
    const zones = await prisma.shippingZone.findMany({
      orderBy: { governorate: "asc" },
    });
    return NextResponse.json(zones);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch shipping zones" }, { status: 500 });
  }
}

// إضافة محافظة أو إدراج جميع المحافظات دفعة واحدة
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // إدراج كل المحافظات دفعة واحدة
    if (body.seedAll) {
      const egyptianGovernorates = [
        "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "الشرقية", 
        "المنوفية", "القليوبية", "الغربية", "البحيرة", "كفر الشيخ", 
        "دمياط", "بورسعيد", "الإسماعيلية", "السويس", "الفيوم", 
        "بني سويف", "المنيا", "أسيوط", "سوهاج", "قنا", 
        "أسوان", "الأقصر", "البحر الأحمر", "الوادي الجديد", "مطروح", 
        "شمال سيناء", "جنوب سيناء"
      ];

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
      return NextResponse.json({ success: true, message: "تمت إضافة المحافظات بنجاح" });
    }

    // إضافة محافظة فردية
    const { governorate, price, freeAbove } = body;
    if (!governorate || price === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

// تعديل سعر محافظة
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, price, freeAbove } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const updatedZone = await prisma.shippingZone.update({
      where: { id },
      data: {
        price: price !== undefined ? parseFloat(price) : undefined,
        freeAbove: freeAbove !== "" && freeAbove !== null ? parseFloat(freeAbove) : null,
      },
    });

    return NextResponse.json(updatedZone);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// حذف محافظة باستخدام الـ ID مُرسلاً في الـ Query Parameters أو Body
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
