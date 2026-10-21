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

  describe('uploadFile (public direct upload)', () => {
    it('POSTs /files as multipart and returns the analysis id', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(
        jsonRes(200, { data: { id: 'analysis-abc', type: 'analysis' } })
      );
      vi.stubGlobal('fetch', fetchMock);

      const res = await client.uploadFile(
        'key-up-1',
        Buffer.from('MZ...'),
        'sample.exe'
      );

      expect(res.id).toBe('analysis-abc');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, opts] = fetchMock.mock.calls[0] as unknown as [
        string,
        RequestInit,
      ];
      expect(url).toContain('/api/v3/files');
      expect(url).not.toContain('upload_url');
      expect(opts.method).toBe('POST');

      const file = (opts.body as FormData).get('file') as File;
      expect(file).toBeTruthy();
      expect(file.name).toBe('sample.exe');
    });

    it('maps a 401 to INVALID_API_KEY', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonRes(401, { error: { code: 'WrongCredentialsError' } })
        );
      vi.stubGlobal('fetch', fetchMock);

      await expect(
        client.uploadFile('key-up-bad', Buffer.from('x'), 'a.bin')
      ).rejects.toMatchObject({ code: 'INVALID_API_KEY', statusCode: 401 });
    });

    it('throws UPSTREAM_ERROR when VT omits the analysis id', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonRes(200, { data: {} }));
      vi.stubGlobal('fetch', fetchMock);

      await expect(
        client.uploadFile('key-up-2', Buffer.from('x'), 'a.bin')
      ).rejects.toMatchObject({ code: 'UPSTREAM_ERROR', statusCode: 502 });
    });
  });

  describe('uploadLargeFile (> 32 MB signed-URL flow)', () => {
    it('GETs /files/upload_url then POSTs the multipart body to the signed URL', async () => {
      const big = Buffer.alloc(32 * 1024 * 1024 + 1);
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonRes(200, { data: 'https://file.upload.virustotal.com/task-1' })
        )
        .mockResolvedValueOnce(
          jsonRes(200, { data: { id: 'analysis-big', type: 'analysis' } })
        );
      vi.stubGlobal('fetch', fetchMock);

      const res = await client.uploadFile('key-big-1', big, 'big.bin');

      expect(res.id).toBe('analysis-big');
      expect(fetchMock).toHaveBeenCalledTimes(2);

      const [url1, opts1] = fetchMock.mock.calls[0] as unknown as [
        string,
        RequestInit,
      ];
      expect(url1).toContain('/files/upload_url');
      expect(opts1.method).toBe('GET');

      const [url2, opts2] = fetchMock.mock.calls[1] as unknown as [
        string,
        RequestInit,
      ];
      expect(url2).toBe('https://file.upload.virustotal.com/task-1');
      expect(opts2.method).toBe('POST');
    });

    it('maps a 403 from the signed URL to FORBIDDEN', async () => {
      const big = Buffer.alloc(32 * 1024 * 1024 + 1);
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonRes(200, { data: 'https://file.upload.virustotal.com/task-2' })
        )
        .mockResolvedValueOnce(jsonRes(403, { error: { code: 'ForbiddenError' } }));
      vi.stubGlobal('fetch', fetchMock);

      await expect(
        client.uploadFile('key-big-2', big, 'a.bin')
      ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 });
    });

    it('throws UPLOAD_FAILED for other 4xx from the signed URL', async () => {
      const big = Buffer.alloc(32 * 1024 * 1024 + 1);
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonRes(200, { data: 'https://file.upload.virustotal.com/task-3' })
        )
        .mockResolvedValueOnce(jsonRes(413, { error: { code: 'PayloadTooLarge' } }));
      vi.stubGlobal('fetch', fetchMock);

      await expect(
        client.uploadFile('key-big-3', big, 'a.bin')
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

    it('falls back to GET /files/upload_url when /users is forbidden', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonRes(403, { error: { code: 'ForbiddenError' } }))
        .mockResolvedValueOnce(
          jsonRes(200, { data: 'https://file.upload.virustotal.com/task-x' })
        );
      vi.stubGlobal('fetch', fetchMock);

      expect(await client.testApiKey('key-fb-1')).toBe(true);
      const [url2, opts2] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
      expect(url2).toContain('/files/upload_url');
      expect(opts2.method).toBe('GET');
    });

    it('treats a 405 from the fallback as invalid rather than valid', async () => {
      // Regression guard: POSTing /files/upload_url used to answer 405 and be
      // mis-read as "key is fine" — while real uploads broke with 405.
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonRes(403, { error: { code: 'ForbiddenError' } }))
        .mockResolvedValueOnce(
          jsonRes(405, { error: { code: 'BAD_REQUEST', message: 'Method Not Allowed' } })
        );
      vi.stubGlobal('fetch', fetchMock);

      await expect(client.testApiKey('key-fb-2')).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        statusCode: 405,
      });
    });
  });

  it('VirusTotalError keeps its shape', () => {
    const e = new VirusTotalError('FORBIDDEN', 'no', 403);
    expect(e.code).toBe('FORBIDDEN');
    expect(e.statusCode).toBe(403);
  });
});
