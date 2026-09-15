import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/rbac';

const DEFAULTS: Record<string,string> = {
  brand_name:'وَهَج', brand_tagline:'تفاصيل صغيرة تصنع وهجًا كبيرًا.', currency:'EGP', announcement:'شحن لجميع المحافظات', whatsapp:'', minimum_order:'0', free_shipping:'0', popup_enabled:'false', maintenance_mode:'false', seo_title:'وَهَج | إكسسوارات عصرية', seo_description:'قطع مختارة بعناية لتضيف لمسة من الوهج إلى كل إطلالة.'
};
export async function GET(){
  const user=await requireUser(['OWNER','ADMIN']); if(!user)return NextResponse.json({error:'غير مصرح'},{status:401});
  const rows=await prisma.siteSetting.findMany();
  const settings={...DEFAULTS,...Object.fromEntries(rows.map(x=>[x.key,x.value]))};
  const theme=await prisma.themeSetting.findFirst();
  const sections=await prisma.homepageSection.findMany({orderBy:{sortOrder:'asc'}});
  const payments=await prisma.paymentSetting.findMany({orderBy:{displayOrder:'asc'}});
  return NextResponse.json({settings,theme,sections,payments});
}
export async function PUT(req:Request){
  const user=await requireUser(['OWNER','ADMIN']); if(!user||!can(user.role,'settingsWrite')) return NextResponse.json({error:'غير مصرح'},{status:403});
  const body=await req.json();
  if(body.settings) for(const [key,value] of Object.entries(body.settings)){await prisma.siteSetting.upsert({where:{key},create:{key,value:String(value??'')},update:{value:String(value??'')}})}
  if(body.theme){const t={primaryColor:String(body.theme.primaryColor||'#171513'),accentColor:String(body.theme.accentColor||'#C8A96B'),background:String(body.theme.background||'#F8F5EF'),textColor:String(body.theme.textColor||'#171513'),logoUrl:body.theme.logoUrl?String(body.theme.logoUrl):null,faviconUrl:body.theme.faviconUrl?String(body.theme.faviconUrl):null,fontFamily:body.theme.fontFamily?String(body.theme.fontFamily):null,radiusScale:body.theme.radiusScale?String(body.theme.radiusScale):'luxury',darkMode:body.theme.darkMode!==false};const current=await prisma.themeSetting.findFirst(); if(current) await prisma.themeSetting.update({where:{id:current.id},data:t}); else await prisma.themeSetting.create({data:t});}
  await prisma.activityLog.create({data:{userId:user.id,action:'UPDATE_CONFIG',entity:'StoreConfiguration',severity:'INFO',metadata:JSON.stringify(Object.keys(body))}});
  return GET();
}
