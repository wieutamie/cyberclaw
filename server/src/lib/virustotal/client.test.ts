import { describe, it, expect, vi, afterEach } from 'vitest';
import { VirusTotalClient, VirusTotalError } from './client.js';

const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('VirusTotalClient public-API flow', () => {
  const client = new VirusTotalClient();

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('uploadFile (public two-step flow)', () => {
    it('POSTs /files/upload_url then uploads the bytes to the signed URL', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonRes(200, {
            data: {
              id: 'deadbeefcafe',
              url: 'https://file.upload.virustotal.com/task-1',
              method: 'PUT',
              required_headers: [{ 'Content-Type': 'application/octet-stream' }],
            },
          })
        )
        .mockResolvedValueOnce(new Response(null, { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);

      const res = await client.uploadFile(
        'key-up-1',
        Buffer.from('MZ...'),
        'sample.exe'
      );

      expect(res.id).toBe('deadbeefcafe');
      expect(fetchMock).toHaveBeenCalledTimes(2);

      const [url1, opts1] = fetchMock.mock.calls[0] as unknown as [
        string,
        RequestInit,
      ];
      expect(url1).toContain('/files/upload_url');
      expect(opts1.method).toBe('POST');
      expect((opts1.body as FormData).get('file_type')).toBe('application/x-msdownload');

      const [url2, opts2] = fetchMock.mock.calls[1] as unknown as [
        string,
        RequestInit,
      ];
      expect(url2).toBe('https://file.upload.virustotal.com/task-1');
      expect(opts2.method).toBe('PUT');
      expect(opts2.body).toBeInstanceOf(Buffer);
    });

    it('maps a 403 from the signed URL to FORBIDDEN', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonRes(200, {
            data: {
              id: 'deadbeefcafe',
              url: 'https://file.upload.virustotal.com/task-2',
              method: 'PUT',
            },
          })
        )
        .mockResolvedValueOnce(jsonRes(403, { error: { code: 'ForbiddenError' } }));
      vi.stubGlobal('fetch', fetchMock);

      await expect(
        client.uploadFile('key-up-2', Buffer.from('x'), 'a.bin')
      ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 });
    });

    it('throws UPLOAD_FAILED for other 4xx from the signed URL', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonRes(200, {
            data: {
              id: 'deadbeefcafe',
              url: 'https://file.upload.virustotal.com/task-3',
              method: 'PUT',
            },
          })
        )
        .mockResolvedValueOnce(jsonRes(413, { error: { code: 'PayloadTooLarge' } }));
      vi.stubGlobal('fetch', fetchMock);

      await expect(
        client.uploadFile('key-up-3', Buffer.from('x'), 'a.bin')
      ).rejects.toMatchObject({ code: 'UPLOAD_FAILED', statusCode: 413 });
    });
  });

  describe('testApiKey', () => {
    it('returns true when GET /users accepts the key', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(
        jsonRes(200, { data: { id: '42', attributes: { name: 'user' } } })
      );
      vi.stubGlobal('fetch', fetchMock);

      expect(await client.testApiKey('key-ok-1')).toBe(true);
      const [url, opts] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toContain('/users');
      expect(opts.method).toBe('GET');
    });

    it('returns false on 401 WrongCredentialsError', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(
        jsonRes(401, { error: { code: 'WrongCredentialsError', message: 'bad key' } })
      );
      vi.stubGlobal('fetch', fetchMock);

      expect(await client.testApiKey('key-bad-1')).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('falls back to POST /files/upload_url when /users is forbidden, and accepts a 400 there', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonRes(403, { error: { code: 'ForbiddenError' } }))
        .mockResolvedValueOnce(
          jsonRes(400, { error: { code: 'BadRequestError', message: 'file_type missing' } })
        );
      vi.stubGlobal('fetch', fetchMock);

      expect(await client.testApiKey('key-fb-1')).toBe(true);
      const [url2, opts2] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
      expect(url2).toContain('/files/upload_url');
      expect(opts2.method).toBe('POST');
    });
  });

  it('VirusTotalError keeps its shape', () => {
    const e = new VirusTotalError('FORBIDDEN', 'no', 403);
    expect(e.code).toBe('FORBIDDEN');
    expect(e.statusCode).toBe(403);
  });
});
