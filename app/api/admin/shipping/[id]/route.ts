import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// تعديل سعر أو بيانات محافظة
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { price, freeAbove, active } = body;

    const updatedZone = await prisma.shippingZone.update({
      where: { id },
      data: {
        price: price !== undefined ? parseFloat(price) : undefined,
        freeAbove: freeAbove !== "" && freeAbove !== null ? parseFloat(freeAbove) : null,
        active: active !== undefined ? Boolean(active) : undefined,
      },
    });

    return NextResponse.json(updatedZone);
  } catch (error) {
    console.error("Error updating shipping zone:", error);
    return NextResponse.json({ error: "Failed to update shipping zone" }, { status: 500 });
  }
}

// حذف محافظة
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await prisma.shippingZone.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "تم الحذف بنجاح" });
  } catch (error) {
    console.error("Error deleting shipping zone:", error);
    return NextResponse.json({ error: "Failed to delete shipping zone" }, { status: 500 });
  }
}
