import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InvalidMultipartBodyError,
  MultipartBodyLimitError,
  parseBoundedMultipart,
  requireSingleMultipartFile,
} from '../../lib/bounded-multipart';

test('parses valid multipart data when the request is within the byte limit', async () => {
  const form = new FormData();
  form.set('data', JSON.stringify({ id: 'order-1' }));
  const request = new Request('https://example.test/api/checkout', {
    method: 'POST',
    body: form,
  });

  const parsed = await parseBoundedMultipart(request, 4096);
  assert.equal(parsed.get('data'), JSON.stringify({ id: 'order-1' }));
});

test('rejects a request stream that exceeds the byte limit before multipart parsing', async () => {
  const request = new Request('https://example.test/api/checkout', {
    method: 'POST',
    headers: { 'content-type': 'multipart/form-data; boundary=test-boundary' },
    body: 'x'.repeat(128),
  });

  await assert.rejects(
    parseBoundedMultipart(request, 32),
    MultipartBodyLimitError,
  );
});

test('rejects a declared oversized request before reading its body', async () => {
  const request = new Request('https://example.test/api/checkout', {
    method: 'POST',
    headers: {
      'content-type': 'multipart/form-data; boundary=test-boundary',
      'content-length': '2048',
    },
    body: 'small',
  });

  await assert.rejects(
    parseBoundedMultipart(request, 1024),
    MultipartBodyLimitError,
  );
});

test('accepts exactly one file field and rejects duplicates or additional fields', () => {
  const valid = new FormData();
  valid.set('file', new File([new Uint8Array([1, 2, 3])], 'image.webp', { type: 'image/webp' }));
  assert.equal(requireSingleMultipartFile(valid, 'file').name, 'image.webp');

  const duplicate = new FormData();
  duplicate.append('file', new File(['one'], 'one.webp', { type: 'image/webp' }));
  duplicate.append('file', new File(['two'], 'two.webp', { type: 'image/webp' }));
  assert.throws(() => requireSingleMultipartFile(duplicate, 'file'), InvalidMultipartBodyError);

  const extraField = new FormData();
  extraField.set('file', new File(['one'], 'one.webp', { type: 'image/webp' }));
  extraField.set('metadata', 'unexpected');
  assert.throws(() => requireSingleMultipartFile(extraField, 'file'), InvalidMultipartBodyError);
});
