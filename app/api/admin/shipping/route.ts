import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// قائمة محافظات مصر الأساسية
const egyptianGovernorates = [
  "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "الشرقية", 
  "المنوفية", "القليوبية", "الغربية", "البحيرة", "كفر الشيخ", 
  "دمياط", "بورسعيد", "الإسماعيلية", "السويس", "الفيوم", 
  "بني سويف", "المنيا", "أسيوط", "سوهاج", "قنا", 
  "أسوان", "الأقصر", "البحر الأحمر", "الوادي الجديد", "مطروح", 
  "شمال سيناء", "جنوب سيناء"
];

// دالة التحقق والإدراج التلقائي (تضمن وجود المحافظات دائماً في قاعدة البيانات)
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
            price: 60, // السعر الافتراضي القابل للتعديل لاحقاً
            active: true,
          },
        });
      }
    }
  } catch (err) {
    console.error("Error seeding governorates automatically:", err);
  }
}

// GET: يقوم تلقائياً بضمان وجود المحافظات ثم إرجاعها للوحة التحكم أو صفحة إتمام الطلب
export async function GET() {
  try {
    await ensureGovernoratesExist(); // الإدراج التلقائي الفوري

    const zones = await prisma.shippingZone.findMany({
      orderBy: { governorate: "asc" },
    });
    return NextResponse.json(zones);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch shipping zones" }, { status: 500 });
  }
}

// POST: لإضافة محافظة جديدة يدوياً إذا رغبت
export async function POST(req: Request) {
  try {
    const body = await req.json();
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
    return NextResponse.json({ error: "Failed to create zone" }, { status: 500 });
  }
}}
