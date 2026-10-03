import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {requireUser} from '@/lib/auth';
import {OrderStatus, PaymentStatus, Prisma} from '@prisma/client';
import { recordInventoryEntry } from '@/lib/inventory';
import { notifyOrderStatus } from '@/lib/whatsapp';
import { syncShipmentFromOrderStatus } from '@/lib/shipment-sync';
import { notifyOrderStatusByEmail, notifyShipmentByEmail } from '@/lib/email';
import { refundGiftCardForOrder } from '@/lib/gift-card';
const READ=['OWNER','ADMIN','MANAGER','ORDER_MANAGER','VIEWER'];
const WRITE=['OWNER','ADMIN','MANAGER','ORDER_MANAGER'];
export async function GET(){const u=await requireUser(READ);if(!u)return NextResponse.json({error:'غير مصرح'},{status:403});return NextResponse.json(await prisma.order.findMany({include:{customer:{select:{id:true,name:true,phone:true,email:true}},items:{include:{product:true}},payments:true,timeline:{orderBy:{createdAt:'asc'}}},orderBy:{createdAt:'desc'},take:100}));}
export async function PUT(req:Request){
 const u=await requireUser(WRITE);if(!u)return NextResponse.json({error:'غير مصرح'},{status:403});
 try{
  const b=await req.json(); if(!b.id)return NextResponse.json({error:'معرّف الطلب مطلوب'},{status:400});
  if(b.status&&!Object.values(OrderStatus).includes(b.status))return NextResponse.json({error:'حالة الطلب غير صحيحة'},{status:400});
  if(b.paymentStatus&&!Object.values(PaymentStatus).includes(b.paymentStatus))return NextResponse.json({error:'حالة الدفع غير صحيحة'},{status:400});
  const nextStatus=(b.status||undefined) as OrderStatus|undefined; const nextPayment=(b.paymentStatus||undefined) as PaymentStatus|undefined;
  const order=await prisma.$transaction(async tx=>{
   const old=await tx.order.findUnique({where:{id:b.id},include:{items:true}}); if(!old)throw new Error('الطلب غير موجود');
   const status=nextStatus||old.status; const paymentStatus=nextPayment||old.paymentStatus;
   if(old.status==='DELIVERED'&&status==='CANCELLED')throw new Error('لا يمكن إلغاء طلب تم تسليمه');
   const data:Prisma.OrderUpdateInput={status,paymentStatus}; if(typeof b.internalNotes==='string')data.internalNotes=b.internalNotes;
   let o=await tx.order.update({where:{id:b.id},data});
   if(status==='CANCELLED'&&old.status!=='CANCELLED'&&!old.stockReleasedAt){
    for(const item of old.items){
     if(item.variantId){
      const variant=await tx.productVariant.update({where:{id:item.variantId},data:{stock:{increment:item.quantity}},select:{id:true,stock:true,name:true,value:true,sku:true,productId:true}});
      const product=await tx.product.findUnique({where:{id:item.productId},select:{id:true,name:true,sku:true}});
      await recordInventoryEntry(tx,{productId:item.productId,variantId:variant.id,orderId:old.id,type:'ORDER_RELEASE',quantity:item.quantity,balanceAfter:variant.stock,productNameSnapshot:product?.name||item.name,variantNameSnapshot:variant.name,variantValueSnapshot:variant.value,skuSnapshot:variant.sku||item.skuSnapshot||product?.sku,reason:'إعادة المخزون عند إلغاء الطلب',reference:old.number});
     } else {
      const product=await tx.product.update({where:{id:item.productId},data:{stock:{increment:item.quantity}},select:{id:true,stock:true,name:true,sku:true}});
      await recordInventoryEntry(tx,{productId:product.id,orderId:old.id,type:'ORDER_RELEASE',quantity:item.quantity,balanceAfter:product.stock,productNameSnapshot:product.name,skuSnapshot:product.sku||item.skuSnapshot,reason:'إعادة المخزون عند إلغاء الطلب',reference:old.number});
     }
    }
    o=await tx.order.update({where:{id:o.id},data:{stockReleasedAt:new Date()}});
   }
   if(status==='CANCELLED'&&old.status!=='CANCELLED') await refundGiftCardForOrder(tx, old);
   if(paymentStatus!==old.paymentStatus) await tx.payment.updateMany({where:{orderId:o.id},data:{status:paymentStatus,confirmedAt:paymentStatus==='CONFIRMED'?new Date():null}});
   if(status!==old.status) await tx.orderTimeline.create({data:{orderId:o.id,status,note:`تم تغيير الحالة بواسطة ${u.name||u.email}`}});
   await syncShipmentFromOrderStatus(tx, o.id, status, { provider: old.shippingProvider, trackingNumber: old.trackingNumber, note: `تمت مزامنة الشحنة مع حالة الطلب بواسطة ${u.name||u.email}` });
   if(paymentStatus!==old.paymentStatus) await tx.orderTimeline.create({data:{orderId:o.id,status:`PAYMENT_${paymentStatus}`,note:'تم تحديث حالة الدفع'}});
   return o;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:5000,timeout:15000});
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
