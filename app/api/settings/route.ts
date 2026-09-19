import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// إلغاء التخزين المؤقت تماماً لضمان ظهور أي تعديل من لوحة التحكم فوراً
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PUBLIC_KEYS=['brand_name','brand_tagline','currency','announcement','whatsapp','minimum_order','free_shipping','popup_enabled','seo_title','seo_description','brand_story','header_menu','footer_links','popup_config'];

export async function GET(){
 const [rows,payments,theme]=await Promise.all([
  prisma.siteSetting.findMany({where:{key:{in:PUBLIC_KEYS}}}),
  prisma.paymentSetting.findMany({where:{enabled:true},select:{method:true,enabled:true,label:true,description:true,iconKey:true,accountName:true,accountNumber:true,instructions:true,proofRequired:true,displayOrder:true},orderBy:{displayOrder:'asc'}}),
  prisma.themeSetting.findFirst({select:{primaryColor:true,accentColor:true,background:true,textColor:true,logoUrl:true,faviconUrl:true,fontFamily:true,radiusScale:true,darkMode:true}})
 ]);

 return NextResponse.json(
  { settings: Object.fromEntries(rows.map(x => [x.key, x.value])), payments, theme },
  {
   headers: {
    'Cache-Control': 'no-store, no-cache, must-validate, proxy-revalidate',
   },
  }
 );
}
