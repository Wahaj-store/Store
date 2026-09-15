import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';
const schema=z.object({email:z.string().email().optional().or(z.literal('')),phone:z.string().trim().optional()}).refine(v=>v.email||v.phone,{message:'أدخل البريد أو الهاتف'}).refine(v=>!v.phone||v.phone.replace(/\D/g,'').length>=8,{message:'رقم الهاتف غير صالح'});
export async function POST(req:Request,{params}:{params:{id:string}}){
 const ip=req.headers.get('x-forwarded-for')||'unknown'; if(!rateLimit(`stock:${ip}`,5,60000)) return NextResponse.json({error:'محاولات كثيرة، حاول لاحقًا'},{status:429});
 try{const body=schema.parse(await req.json()); const p=await prisma.product.findUnique({where:{id:params.id},select:{id:true,stock:true,status:true}}); if(!p||p.status!=='PUBLISHED') return NextResponse.json({error:'المنتج غير متاح'},{status:404}); if(p.stock>0)return NextResponse.json({message:'المنتج متوفر بالفعل'});
  const phone=body.phone?normalizePhone(body.phone):null; const existing=await prisma.backInStockSubscription.findFirst({where:{productId:p.id,notifiedAt:null,OR:[...(body.email?[{email:body.email.toLowerCase()}]:[]),...(phone?[{phone}]:[])]}}); if(existing)return NextResponse.json({ok:true,message:'تم تسجيل طلب التنبيه مسبقًا'}); await prisma.backInStockSubscription.create({data:{productId:p.id,email:body.email?body.email.toLowerCase():null,phone}}); return NextResponse.json({ok:true,message:'تم تسجيل طلب التنبيه'});
 }catch(e:any){return NextResponse.json({error:e?.issues?.[0]?.message||'بيانات غير صحيحة'},{status:400})}
}
