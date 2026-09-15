import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {requireUser} from '@/lib/auth';
import {can} from '@/lib/rbac';
export async function GET(){
  const u=await requireUser();
  if(!u||!can(u.role,'securityRead'))return NextResponse.json({error:'غير مصرح'},{status:403});
  const [logs,users]=await Promise.all([
    prisma.activityLog.findMany({orderBy:{createdAt:'desc'},take:100,include:{user:{select:{email:true,name:true,role:true}}}}),
    prisma.user.count({where:{active:true}})
  ]);
  return NextResponse.json({logs,activeAdmins:users});
}
