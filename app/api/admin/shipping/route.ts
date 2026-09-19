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
