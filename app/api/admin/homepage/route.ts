import {NextResponse} from 'next/server';import {prisma} from '@/lib/prisma';import {requireUser} from '@/lib/auth';

function serializeConfig(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    try { return JSON.stringify(JSON.parse(value)); } catch { return null; }
  }
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  return JSON.stringify(value);
}

export async function GET(){const u=await requireUser(['OWNER','ADMIN','MANAGER','EDITOR','VIEWER']);if(!u)return NextResponse.json({error:'غير مصرح'},{status:401});return NextResponse.json(await prisma.homepageSection.findMany({orderBy:{sortOrder:'asc'}}))}
export async function POST(req:Request){const u=await requireUser(['OWNER','ADMIN','MANAGER','EDITOR']);if(!u)return NextResponse.json({error:'غير مصرح'},{status:403});const b=await req.json();return NextResponse.json(await prisma.homepageSection.create({data:{type:b.type,title:b.title||null,subtitle:b.subtitle||null,imageUrl:b.imageUrl||null,ctaText:b.ctaText||null,ctaUrl:b.ctaUrl||null,visible:b.visible!==false,sortOrder:Number(b.sortOrder||0),config:serializeConfig(b.config)}}),{status:201})}
export async function PUT(req:Request){const u=await requireUser(['OWNER','ADMIN','MANAGER','EDITOR']);if(!u)return NextResponse.json({error:'غير مصرح'},{status:403});const b=await req.json();if(b.reorder){await prisma.$transaction((b.items||[]).map((x:any,i:number)=>prisma.homepageSection.update({where:{id:x.id},data:{sortOrder:i}})));return NextResponse.json({ok:true})}return NextResponse.json(await prisma.homepageSection.update({where:{id:b.id},data:{type:b.type,title:b.title||null,subtitle:b.subtitle||null,imageUrl:b.imageUrl||null,ctaText:b.ctaText||null,ctaUrl:b.ctaUrl||null,visible:b.visible!==false,sortOrder:Number(b.sortOrder||0),config:serializeConfig(b.config)}}))}
export async function DELETE(req:Request){const u=await requireUser(['OWNER','ADMIN','MANAGER']);if(!u)return NextResponse.json({error:'غير مصرح'},{status:403});await prisma.homepageSection.delete({where:{id:(await req.json()).id}});return NextResponse.json({ok:true})}
