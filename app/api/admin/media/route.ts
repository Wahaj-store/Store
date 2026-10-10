import { NextResponse } from 'next/server';
import { del, put } from '@vercel/blob';
import crypto from 'crypto';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type ImageKind = 'jpg' | 'png' | 'webp';

function detectImageKind(bytes: Uint8Array): ImageKind | null {
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const webp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  return jpeg ? 'jpg' : png ? 'png' : webp ? 'webp' : null;
}

export async function GET() {
  const user = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'EDITOR', 'VIEWER']);
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  return NextResponse.json(await prisma.media.findMany({ orderBy: { createdAt: 'desc' } }));
}

export async function POST(req: Request) {
  const user = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']);
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'لم يتم اختيار ملف' }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'يسمح بصور JPG أو PNG أو WebP فقط' }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'حجم الصورة يجب أن يكون بين 1 بايت و8MB' }, { status: 400 });
  const publicBlobToken = process.env.BLOB_PUBLIC_READ_WRITE_TOKEN;
  if (!publicBlobToken) return NextResponse.json({ error: 'أضف BLOB_PUBLIC_READ_WRITE_TOKEN لمخزن الوسائط العامة في Vercel.' }, { status: 503 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectImageKind(bytes);
  const expectedKind = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
  if (kind !== expectedKind) return NextResponse.json({ error: 'محتوى الصورة لا يطابق نوع الملف' }, { status: 400 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120) || `upload.${kind}`;
  let blobUrl: string | null = null;
  try {
    const blob = await put(`wahaj/media/${crypto.randomUUID()}-${safeName}`, file, {
      access: 'public',
      token: publicBlobToken,
      contentType: file.type,
      addRandomSuffix: false,
    });
    blobUrl = blob.url;
    const media = await prisma.media.create({ data: { url: blob.url, name: file.name, type: file.type, size: file.size } });
    return NextResponse.json(media);
  } catch (error) {
    if (blobUrl) {
      await del(blobUrl, { token: publicBlobToken }).catch((cleanupError) => {
        console.error('MEDIA_UPLOAD_CLEANUP_ERROR:', cleanupError instanceof Error ? cleanupError.message : 'unknown');
      });
    }
    console.error('MEDIA_UPLOAD_ERROR:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'تعذر حفظ الصورة حاليًا' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']);
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body?.id || typeof body.id !== 'string') return NextResponse.json({ error: 'معرف الوسيط غير صالح' }, { status: 400 });
  const media = await prisma.media.findUnique({ where: { id: body.id }, select: { url: true } });
  if (!media) return NextResponse.json({ error: 'الوسيط غير موجود' }, { status: 404 });
  const publicBlobToken = process.env.BLOB_PUBLIC_READ_WRITE_TOKEN;
  if (!publicBlobToken) {
    return NextResponse.json({ error: 'مخزن الوسائط العامة غير مهيأ. لم يتم حذف سجل الوسيط.' }, { status: 503 });
  }
  try {
    // Keep the database record if storage deletion fails so the operation can be retried.
    await del(media.url, { token: publicBlobToken });
  } catch (error) {
    console.error('MEDIA_DELETE_STORAGE_ERROR:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'تعذر حذف الملف من التخزين. لم يتم حذف سجل الوسيط، ويمكن إعادة المحاولة.' }, { status: 502 });
  }
  await prisma.media.delete({ where: { id: body.id } });
  return NextResponse.json({ ok: true });
}
