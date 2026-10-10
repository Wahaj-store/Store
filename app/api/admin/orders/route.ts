import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {requireUser} from '@/lib/auth';
import {OrderStatus, PaymentStatus, Prisma} from '@prisma/client';
import { updateOrderStatus } from '@/lib/order-service';
import { updatePaymentStatus } from '@/lib/payment-service';
import { notifyOrderStatus } from '@/lib/whatsapp';
import { syncShipmentFromOrderStatus } from '@/lib/shipment-sync';
import { notifyOrderStatusByEmail, notifyShipmentByEmail } from '@/lib/email';
const READ=['OWNER','ADMIN','MANAGER','ORDER_MANAGER','VIEWER'];
const WRITE=['OWNER','ADMIN','MANAGER','ORDER_MANAGER'];
export async function GET() {
  const u = await requireUser(READ);
  if (!u) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const orders = await prisma.order.findMany({
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
      items: { include: { product: true } },
      // لا نضمّن proofUrl؛ قد يكون pathname خاصًا ولا حاجة له في قائمة الطلبات.
      payments: {
        select: {
          id: true,
          orderId: true,
          method: true,
          status: true,
          reference: true,
          amount: true,
          confirmedAt: true,
          createdAt: true,
        },
      },
      timeline: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json(orders, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
export async function PUT(req:Request){
 const u=await requireUser(WRITE);if(!u)return NextResponse.json({error:'غير مصرح'},{status:403});
 try{
  const b=await req.json(); if(!b.id)return NextResponse.json({error:'معرّف الطلب مطلوب'},{status:400});
  if(b.status&&!Object.values(OrderStatus).includes(b.status))return NextResponse.json({error:'حالة الطلب غير صحيحة'},{status:400});
  if(b.paymentStatus&&!Object.values(PaymentStatus).includes(b.paymentStatus))return NextResponse.json({error:'حالة الدفع غير صحيحة'},{status:400});
  const nextStatus=(b.status||undefined) as OrderStatus|undefined; const nextPayment=(b.paymentStatus||undefined) as PaymentStatus|undefined;
  const order=await prisma.$transaction(async tx=>{
   const old=await tx.order.findUnique({where:{id:b.id},select:{id:true,status:true,paymentStatus:true,customerId:true,customerNameSnapshot:true,number:true,customerPhoneSnapshot:true}}); if(!old)throw new Error('الطلب غير موجود');
   let updatedOrder=await tx.order.findUnique({where:{id:old.id}}); 
   if(nextStatus && nextStatus !== old.status) updatedOrder=await updateOrderStatus(tx,{orderId:old.id,status:nextStatus,actorName:u.name||u.email, note:typeof b.internalNotes==='string'?b.internalNotes:undefined});
   if(nextStatus && nextStatus === old.status && typeof b.internalNotes==='string') updatedOrder=await tx.order.update({where:{id:old.id},data:{internalNotes:b.internalNotes}});
   if(nextPayment && nextPayment !== old.paymentStatus) await updatePaymentStatus(tx,{orderId:old.id,status:nextPayment,actorName:u.name||u.email});
   await syncShipmentFromOrderStatus(tx,old.id,nextStatus || old.status,{note:`تمت مزامنة الشحنة بواسطة ${u.name||u.email}`});
   return await tx.order.findUnique({where:{id:old.id}});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:5000,timeout:15000});
  if (!order) return NextResponse.json({error:'تعذر تحديث الطلب'},{status:500});
  await prisma.activityLog.create({data:{userId:u.id,action:'UPDATE_ORDER',entity:'Order',entityId:order.id,metadata:JSON.stringify({status:b.status,paymentStatus:b.paymentStatus})}});
  if (nextStatus) {
   const customer = order.customerId ? await prisma.customer.findUnique({where:{id:order.customerId},select:{email:true,name:true}}) : null;
   await notifyOrderStatusByEmail({email:customer?.email,name:customer?.name || order.customerNameSnapshot,orderNumber:order.number,status:order.status});
  }
  if (nextStatus && nextStatus !== undefined && nextStatus !== undefined) {
   await notifyOrderStatus({ id: order.id, number: order.number, customerId: order.customerId, phone: order.customerPhoneSnapshot, status: order.status });
  }
  return NextResponse.json(order);
 }catch(e:any){return NextResponse.json({error:e?.message||'تعذر تحديث الطلب'},{status:e?.code==='P2034'?409:400});}
}
