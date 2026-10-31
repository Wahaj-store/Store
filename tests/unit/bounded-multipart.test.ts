import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MultipartBodyLimitError,
  parseBoundedMultipart,
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
