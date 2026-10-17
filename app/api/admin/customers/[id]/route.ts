import {NextResponse} from 'next/server';import {requirePermission} from '@/lib/auth';import {prisma} from '@/lib/prisma';
export async function GET(_:Request, props:{params: Promise<{id:string}>}) {
  const params = await props.params;
  const auth=await requirePermission('customersRead');if(!auth.user)return NextResponse.json({error:'غير مصرح'},{status:auth.status});const c=await prisma.customer.findUnique({where:{id:params.id},select:{id:true,name:true,phone:true,email:true,lastLoginAt:true,createdAt:true,updatedAt:true,addresses:true,orders:{include:{items:true},orderBy:{createdAt:'desc'}},reviews:{include:{product:true},orderBy:{createdAt:'desc'}}}});return c?NextResponse.json(c):NextResponse.json({error:'العميل غير موجود'},{status:404})
}
