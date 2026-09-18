import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { price, freeAbove } = body;

    const updatedZone = await prisma.shippingZone.update({
      where: { id },
      data: {
        price: price !== undefined ? parseFloat(price) : undefined,
        freeAbove: freeAbove !== undefined && freeAbove !== "" ? parseFloat(freeAbove) : null,
      },
    });

    return NextResponse.json(updatedZone);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update shipping zone" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    await prisma.shippingZone.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete shipping zone" }, { status: 500 });
  }
}
