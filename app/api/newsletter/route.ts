import {NextResponse} from 'next/server';import {z} from 'zod';import {prisma} from '@/lib/prisma';
const S=z.object({email:z.string().email().max(254),source:z.string().max(80).optional()});
export async function POST(req:Request){try{const b=S.parse(await req.json());await prisma.newsletterSubscriber.upsert({where:{email:b.email.toLowerCase()},create:{email:b.email.toLowerCase(),source:b.source},update:{active:true}});return NextResponse.json({ok:true});}catch{return NextResponse.json({error:'البريد الإلكتروني غير صالح'},{status:400});}}
