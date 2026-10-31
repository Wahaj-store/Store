export class MultipartBodyLimitError extends Error {
  constructor() {
    super('حجم الطلب أكبر من الحد المسموح');
    this.name = 'MultipartBodyLimitError';
  }
}

export class InvalidMultipartBodyError extends Error {
  constructor() {
    super('صيغة طلب الملفات غير صالحة');
    this.name = 'InvalidMultipartBodyError';
  }
}

/**
 * Reads the request stream under a strict byte ceiling before invoking the
 * platform multipart parser. Content-Length is an early rejection hint only;
 * the stream is always counted because the header may be absent or incorrect.
 */
export async function parseBoundedMultipart(request: Request, maxBytes: number): Promise<FormData> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new RangeError('maxBytes must be a positive safe integer');
  }

  const contentType = request.headers.get('content-type') || '';
  if (!/^multipart\/form-data\s*;/i.test(contentType)) {
    throw new InvalidMultipartBodyError();
  }

  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader && /^\d+$/.test(contentLengthHeader)) {
    const contentLength = Number(contentLengthHeader);
    if (!Number.isSafeInteger(contentLength) || contentLength > maxBytes) {
      throw new MultipartBodyLimitError();
    }
  }

  const reader = request.body?.getReader();
  if (!reader) throw new InvalidMultipartBodyError();

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new MultipartBodyLimitError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const headers = new Headers(request.headers);
  headers.delete('content-length');
  headers.delete('transfer-encoding');

  try {
    const boundedRequest = new Request(request.url, {
      method: 'POST',
      headers,
      body: new Blob([body]),
    });
    return await boundedRequest.formData();
  } catch {
    throw new InvalidMultipartBodyError();
  }
}
