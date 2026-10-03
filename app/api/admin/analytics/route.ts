import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

const DAY = 24 * 60 * 60 * 1000;

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(request: Request) {
  const u = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'VIEWER']);
  if (!u) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const url = new URL(request.url);
  const requestedDays = Number(url.searchParams.get('days') || 30);
  const days = [7, 30, 90, 365].includes(requestedDays) ? requestedDays : 30;

  const now = new Date();
  const periodStart = new Date(now.getTime() - days * DAY);
  const previousStart = new Date(periodStart.getTime() - days * DAY);

  const [orders, customers, products, reviews, lowStock] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: previousStart } },
      select: {
        id: true,
        total: true,
        shipping: true,
        discount: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        createdAt: true,
        customerId: true,
        customerNameSnapshot: true,
        items: { select: { productId: true, name: true, quantity: true, price: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        orders: { select: { total: true, status: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
      },
    }),
    prisma.product.count(),
    prisma.review.count(),
    prisma.product.count({ where: { stock: { lte: 5 } } }),
  ]);

  const completed = orders.filter((o) => o.status !== 'CANCELLED');
  const currentOrders = completed.filter((o) => o.createdAt >= periodStart);
  const previousOrders = completed.filter((o) => o.createdAt >= previousStart && o.createdAt < periodStart);

  const currentSales = currentOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const previousSales = previousOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const currentAov = currentOrders.length ? currentSales / currentOrders.length : 0;
  const previousAov = previousOrders.length ? previousSales / previousOrders.length : 0;

  const currentCustomerIds = new Set(currentOrders.map((o) => o.customerId).filter(Boolean) as string[]);
  const previousCustomerIds = new Set(previousOrders.map((o) => o.customerId).filter(Boolean) as string[]);
  const newCustomers = customers.filter((c) => c.createdAt >= periodStart).length;

  const dailyMap = new Map<string, { sales: number; orders: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = startOfDay(new Date(now.getTime() - i * DAY));
    dailyMap.set(d.toISOString().slice(0, 10), { sales: 0, orders: 0 });
  }
  for (const order of currentOrders) {
    const key = startOfDay(order.createdAt).toISOString().slice(0, 10);
    const bucket = dailyMap.get(key);
    if (bucket) {
      bucket.sales += Number(order.total);
      bucket.orders += 1;
    }
  }

  const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const order of currentOrders) {
    for (const item of order.items) {
      const key = item.productId || item.name;
      const row = productMap.get(key) || { name: item.name, quantity: 0, revenue: 0 };
      row.quantity += item.quantity;
      row.revenue += Number(item.price) * item.quantity;
      productMap.set(key, row);
    }
  }

  const topProducts = [...productMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)
    .map((x) => ({ ...x, revenue: round(x.revenue) }));

  const paymentMap = new Map<string, { orders: number; sales: number }>();
  for (const order of currentOrders) {
    const row = paymentMap.get(order.paymentMethod) || { orders: 0, sales: 0 };
    row.orders += 1;
    row.sales += Number(order.total);
    paymentMap.set(order.paymentMethod, row);
  }

  const statusMap = new Map<string, number>();
  for (const order of currentOrders) statusMap.set(order.status, (statusMap.get(order.status) || 0) + 1);

  const customerSpend = new Map<string, { orders: number; spend: number; lastOrder: Date | null }>();
  for (const order of currentOrders) {
    if (!order.customerId) continue;
    const row = customerSpend.get(order.customerId) || { orders: 0, spend: 0, lastOrder: null };
    row.orders += 1;
    row.spend += Number(order.total);
    if (!row.lastOrder || order.createdAt > row.lastOrder) row.lastOrder = order.createdAt;
    customerSpend.set(order.customerId, row);
  }

  const topCustomers = [...customerSpend.entries()]
    .sort((a, b) => b[1].spend - a[1].spend)
    .slice(0, 8)
    .map(([id, x]) => {
      const customer = customers.find((c) => c.id === id);
      return { id, name: customer?.name || 'عميل', orders: x.orders, spend: round(x.spend), lastOrder: x.lastOrder };
    });

  const customerRows = customers.map((customer) => {
    const validOrders = customer.orders.filter((o) => o.status !== 'CANCELLED');
    const spend = validOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const lastOrder = validOrders.at(-1)?.createdAt || null;
    return { id: customer.id, spend, orderCount: validOrders.length, firstOrder: validOrders[0]?.createdAt || null, lastOrder };
  });

  const segmentCounts = {
    vip: 0,
    loyal: 0,
    highValue: 0,
    new: 0,
    atRisk: 0,
    dormant: 0,
    oneTime: 0,
    noPurchase: 0,
  };
  for (const c of customerRows) {
    if (c.orderCount === 0) segmentCounts.noPurchase += 1;
    else if (c.spend >= 10000 || c.orderCount >= 5) segmentCounts.vip += 1;
    else if (c.orderCount >= 3) segmentCounts.loyal += 1;
    else if (c.spend >= 5000) segmentCounts.highValue += 1;
    else if (c.lastOrder && now.getTime() - c.lastOrder.getTime() <= 30 * DAY) segmentCounts.new += 1;
    else if (c.lastOrder && now.getTime() - c.lastOrder.getTime() <= 90 * DAY) segmentCounts.atRisk += 1;
    else if (c.lastOrder) segmentCounts.dormant += 1;
    else segmentCounts.oneTime += 1;
  }

  const pct = (current: number, previous: number) => previous === 0 ? (current === 0 ? 0 : 100) : round(((current - previous) / previous) * 100);

  return NextResponse.json({
    range: days,
    totals: {
      sales: round(currentSales),
      orders: currentOrders.length,
      customers: customers.length,
      activeCustomers: currentCustomerIds.size,
      newCustomers,
      aov: round(currentAov),
      products,
      reviews,
      lowStock,
    },
    comparison: {
      sales: pct(currentSales, previousSales),
      orders: pct(currentOrders.length, previousOrders.length),
      aov: pct(currentAov, previousAov),
      activeCustomers: pct(currentCustomerIds.size, previousCustomerIds.size),
    },
    daily: [...dailyMap.entries()].map(([date, x]) => ({ date, sales: round(x.sales), orders: x.orders })),
    topProducts,
    topCustomers,
    payments: [...paymentMap.entries()].map(([method, x]) => ({ method, orders: x.orders, sales: round(x.sales) })).sort((a, b) => b.sales - a.sales),
    statuses: [...statusMap.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
    segments: segmentCounts,
  });
}
