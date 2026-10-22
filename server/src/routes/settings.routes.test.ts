import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { ScanRecord } from '../types/index.js';

// In-memory store shared with the mocked supabase module.
const { scans, userSettings, apiKeys, profiles } = vi.hoisted(() => ({
  scans: new Map<string, ScanRecord>(),
  userSettings: new Map<string, unknown>(),
  apiKeys: new Map<string, unknown>(),
  profiles: new Map<string, unknown>(),
}));

vi.mock('../lib/supabase.js', () => ({
  supabase: null,
  memoryStore: { profiles, userSettings, apiKeys, scans },
}));

import { app } from '../app.js';
import { verifyAnonToken } from '../lib/anonSession.js';

/** Registers an anonymous session and returns its bearer token. */
async function newSession(): Promise<string> {
  const res = await request(app).get('/api/settings');
  expect(res.status).toBe(200);
  const token = res.headers['x-anon-session'];
  expect(token).toBeTruthy();
  return token as string;
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeEach(() => {
  scans.clear();
  userSettings.clear();
  apiKeys.clear();
  profiles.clear();
});

describe('GET /api/settings', () => {
  it('returns defaults for a brand-new anonymous session', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      default_tab: 'file',
      danger_threshold: 3,
      show_upload_warning: true,
      auto_open_report: false,
      history_retention_days: 90,
    });
  });
});

describe('PUT /api/settings — every preference the UI can change', () => {
  it('persists scan preferences and returns the merged settings', async () => {
    const token = await newSession();

    const res = await request(app)
      .put('/api/settings')
      .set(auth(token))
      .send({
        default_tab: 'hash',
        danger_threshold: 7,
        show_upload_warning: false,
        auto_open_report: true,
        history_retention_days: null,
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      default_tab: 'hash',
      danger_threshold: 7,
      show_upload_warning: false,
      auto_open_report: true,
      history_retention_days: null,
    });

    // ...and a reload (the Preferences page re-fetch) still sees them.
    const reloaded = await request(app).get('/api/settings').set(auth(token));
    expect(reloaded.body.data).toMatchObject({
      default_tab: 'hash',
      danger_threshold: 7,
      show_upload_warning: false,
      auto_open_report: true,
      history_retention_days: null,
    });
  });

  it('persists date/time and language preferences', async () => {
    const token = await newSession();
    const res = await request(app)
      .put('/api/settings')
      .set(auth(token))
      .send({ timezone: 'Europe/Berlin', time_format: '12h', language: 'id' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      timezone: 'Europe/Berlin',
      time_format: '12h',
      language: 'id',
    });
  });

  it('rejects an out-of-range danger threshold instead of silently ignoring it', async () => {
    const token = await newSession();
    const res = await request(app)
      .put('/api/settings')
      .set(auth(token))
      .send({ danger_threshold: 99 });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.ok).toBe(false);
  });

  it('rejects an unknown default tab', async () => {
    const token = await newSession();
    const res = await request(app)
      .put('/api/settings')
      .set(auth(token))
      .send({ default_tab: 'nope' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('POST /api/settings/api-key/test', () => {
  it('returns 400 when no key is typed and none is stored', async () => {
    const token = await newSession();
    const res = await request(app)
      .post('/api/settings/api-key/test')
      .set(auth(token))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('rejects a malformed key without calling VirusTotal', async () => {
    const token = await newSession();
    const res = await request(app)
      .post('/api/settings/api-key/test')
      .set(auth(token))
      .send({ apiKey: 'not-a-key' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/settings/api-key', () => {
  it('reports no key for a fresh session', async () => {
    const token = await newSession();
    const res = await request(app).get('/api/settings/api-key').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ hasKey: false, last4: null });
  });
});

describe('DELETE /api/scans — clear all history', () => {
  it('removes every scan for the caller and leaves other sessions alone', async () => {
    const mineToken = await newSession();
    const theirsToken = await newSession();

    const mineId = verifyAnonToken(mineToken)!;
    const theirsId = verifyAnonToken(theirsToken)!;

    const record = (id: string, userId: string): ScanRecord =>
      ({
        id,
        user_id: userId,
        type: 'file',
        item_label: `scan-${id}`,
        state: 'completed',
        verdict: 'clean',
        stats: {
          malicious: 0,
          suspicious: 0,
          harmless: 0,
          undetected: 71,
          timeout: 0,
          failure: 0,
          unsupported: 0,
        },
        vendor_results: [],
        sha256: null,
        created_at: new Date().toISOString(),
      }) as unknown as ScanRecord;

    scans.set('m1', record('m1', mineId));
    scans.set('m2', record('m2', mineId));
    scans.set('t1', record('t1', theirsId));

    const cleared = await request(app).delete('/api/scans').set(auth(mineToken));
    expect(cleared.status).toBe(200);

    // Only the caller's rows are gone.
    expect([...scans.keys()]).toEqual(['t1']);

    const theirsHistory = await request(app).get('/api/scans').set(auth(theirsToken));
    expect(theirsHistory.body.data.total).toBe(1);
  });
});
