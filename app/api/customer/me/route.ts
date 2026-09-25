import {NextResponse} from 'next/server';
import {Prisma} from '@prisma/client';
import {getCustomer} from '@/lib/customer-auth';
import {prisma} from '@/lib/prisma';

const customerSelect: Prisma.CustomerSelect = {
  id: true,
  name: true,
  phone: true,
  secondaryPhone: true, // إضافة الرقم الاحتياطي للعميل
  email: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  addresses: true,
  orders: {
    select: {
      id: true,
      number: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      total: true,
      shipping: true,
      discount: true,
      shippingProvider: true,
      trackingNumber: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      timeline: {
        select: {
          id: true,
          status: true,
          note: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' }
      },
      items: {
        select: {
          id: true,
          productId: true,
          variantId: true,
          variantName: true,
          variantValue: true,
          name: true,
          quantity: true,
          price: true,
          skuSnapshot: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  },
  wishlist: {
    select: {
      id: true,
      productId: true,
      createdAt: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          comparePrice: true,
          images: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, url: true, alt: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  }
};

export async function GET() {
  const c = await getCustomer();
  if (!c) return NextResponse.json({error: 'غير مسجل'}, {status: 401});
  return NextResponse.json(await prisma.customer.findUnique({where: {id: c.id}, select: customerSelect}));
}

export async function PUT(req: Request) {
  const c = await getCustomer();
  if (!c) return NextResponse.json({error: 'غير مسجل'}, {status: 401});
  const b = await req.json();

  const name = String(b.name || '').trim();
  if (name.length < 2 || name.length > 100) return NextResponse.json({error: 'الاسم غير صالح'}, {status: 400});

  const email = b.email ? String(b.email).trim().toLowerCase() : null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({error: 'البريد الإلكتروني غير صالح'}, {status: 400});

  // معالجة الرقم الاحتياطي وتحديثه بأمان دون المساس بالرقم الأساسي الثابت
  const secondaryPhone = b.secondaryPhone ? String(b.secondaryPhone).trim() : null;

  return NextResponse.json(await prisma.customer.update({
    where: {id: c.id},
    data: {
      name,
      email,
      secondaryPhone
    },
    select: {
      id: true,
      name: true,
      phone: true,
      secondaryPhone: true,
      email: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      addresses: true
    }
  }));
}
