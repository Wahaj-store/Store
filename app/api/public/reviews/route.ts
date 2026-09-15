import {NextResponse} from 'next/server';import {prisma} from '@/lib/prisma';
export async function GET(req:Request){const id=new URL(req.url).searchParams.get('productId');if(!id)return NextResponse.json([]);return NextResponse.json(await prisma.review.findMany({where:{productId:id,approved:true},include:{customer:{select:{name:true}}},orderBy:{createdAt:'desc'}}))}
