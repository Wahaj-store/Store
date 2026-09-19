import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // إذا أرسل زر الإدخال التلقائي لكل المحافظات
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
        await prisma.shippingZone.upsert({
          where: { governorate: gov },
          update: {},
          create: {
            governorate: gov,
            price: 60, // سعر افتراضي قابل للتعديل
            active: true,
          },
        });
      }
      return NextResponse.json({ success: true, message: "تمت إضافة جميع المحافظات بنجاح" });
    }

    // الإضافة الفردية العادية
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
