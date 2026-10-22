import crypto from 'crypto';
import { supabase, memoryStore } from '../lib/supabase.js';
import { vtClient, VirusTotalError } from '../lib/virustotal/client.js';
import { mapVendorResults, aggregateStats, hasVendorData } from '../lib/virustotal/mappers.js';
import { calculateVerdict } from '../lib/virustotal/verdict.js';
import { vtHashCache } from '../lib/virustotal/hashCache.js';
import { ApiKeyService } from './apiKey.service.js';
import { SettingsService } from './settings.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { ScanRecord } from '../types/index.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { assertConsistentStats } from '../lib/statsConsistency.js';

export class ScanService {
  /**
   * Resolves the VirusTotal key used for a scan.
   *
   * There is intentionally NO demo/mock fallback: if neither a per-user key nor
   * the server-wide `SYSTEM_VT_API_KEY` is available, scanning cannot produce a
   * real verdict, so we fail loudly instead of fabricating results. The client
   * surfaces this as an explicit "not configured" error.
   */
  private static async getEffectiveKey(userId: string): Promise<string> {
    const key = await ApiKeyService.getUserApiKey(userId);
    if (!key) {
      throw new AppError(
        'SCAN_NOT_CONFIGURED',
        'Scanning service is not configured. The server is missing a VirusTotal API key.',
        503
      );
    }
    return key;
  }

  /**
   * Susun field "completed" (stats, verdict, vendor_results, meta) dari
   * attributes laporan VirusTotal. Dipakai bersama oleh pre-check hash-first
   * dan oleh polling analisis agar hasilnya selalu identik.
   */
  private static async buildCompletedFields(
    userId: string,
    attrs: any,
    itemMetaBase: Record<string, unknown> = {}
  ): Promise<Partial<ScanRecord>> {
    const vendor_results = mapVendorResults(attrs?.last_analysis_results);
    // Laporan tanpa satu pun engine BUKAN "clean" — itu berarti VT belum punya
    // hasil. Lempar NOT_FOUND agar pemanggil memakai jalur upload/polling.
    if (!hasVendorData(vendor_results)) {
      throw new VirusTotalError(
        'NOT_FOUND',
        'VirusTotal has no engine results for this item yet.',
        404
      );
    }
    const stats = aggregateStats(vendor_results);
    const settings = await SettingsService.getSettings(userId);
    const verdict = calculateVerdict(stats, settings.danger_threshold);

    return {
      state: 'completed' as const,
      verdict,
      stats,
      vendor_results,
      item_sha256: attrs?.sha256 ?? null,
      item_meta: {
        ...itemMetaBase,
        size: attrs?.size,
        type_description: attrs?.type_description,
        names: attrs?.names,
        md5: attrs?.md5,
        sha1: attrs?.sha1,
        sha256: attrs?.sha256,
        first_submission_date: attrs?.first_submission_date,
        last_analysis_date: attrs?.last_analysis_date,
      },
      completed_at: new Date().toISOString(),
    };
  }

  static async createFileScan(
    userId: string,
    fileBuffer: Buffer,
    filename: string
  ): Promise<ScanRecord> {
    const apiKey = await this.getEffectiveKey(userId);
    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const md5 = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const sha1 = crypto.createHash('sha1').update(fileBuffer).digest('hex');

    const scanId = crypto.randomUUID();
    const now = new Date().toISOString();

    const initialRecord: ScanRecord = {
      id: scanId,
      user_id: userId,
      type: 'file',
      item_label: filename,
      item_sha256: sha256,
      state: 'queued',
      created_at: now,
      item_meta: {
        size: fileBuffer.length,
        sha256,
        md5,
        sha1,
        names: [filename],
      },
    };

    // Save initial record
    await this.saveScan(initialRecord);

    // ---- Fast path: hash-first lookup -------------------------------------
    // Most files people scan already exist in VirusTotal. Looking the SHA-256
    // up directly returns a full report in ~1s, versus uploading and waiting
    // 30-60s for a fresh analysis. Only fall through to the upload when VT has
    // genuinely never seen the file (404).

    // Cache check: if we've already scanned this exact file within TTL,
    // return the cached result immediately — zero VT API calls.
    const cachedFile = vtHashCache.get(sha256);
    if (cachedFile) {
      logger.info({ sha256 }, 'File scan served from hash cache');
      return cachedFile;
    }

    try {
      const existing = await vtClient.getFileReport(apiKey, sha256);
      const attrs = existing?.data?.attributes;
      if (attrs?.last_analysis_results) {
        const completed = await this.buildCompletedFields(
          userId,
          attrs,
          initialRecord.item_meta as Record<string, unknown>
        );
        completed.raw_payload = existing.data;
        await this.updateScan(scanId, completed);
        // Populate cache so future identical files skip the VT call.
        vtHashCache.set(sha256, { ...initialRecord, ...completed });
        return { ...initialRecord, ...completed };
      }
    } catch (err) {
      // NOT_FOUND (never seen) or a transient upstream error: fall back to the
      // regular upload flow, which will surface any real failure itself.
      if (!(err instanceof VirusTotalError && err.code === 'NOT_FOUND')) {
        logger.warn({ err }, 'Hash pre-check on VirusTotal failed; falling back to upload');
      }
    }

    try {
      const res = await vtClient.uploadFile(apiKey, fileBuffer, filename);
      initialRecord.vt_analysis_id = res.id;
      initialRecord.state = 'in_progress';
      await this.updateScan(scanId, {
        vt_analysis_id: res.id,
        state: 'in_progress',
      });
    } catch (err: any) {
      // No fabricated fallback: mark the scan as failed and surface the real
      // upstream error so the user sees the truth and can retry.
      logger.warn({ err }, 'File upload to VirusTotal failed');
      await this.updateScan(scanId, { state: 'failed' });
      initialRecord.state = 'failed';
      throw this.toScanError(err, 'File upload to VirusTotal failed');
    }

    return initialRecord;
  }

  /**
   * Converts an arbitrary upstream failure into a typed `AppError` (or rethrows
   * the original `VirusTotalError`) so the HTTP layer returns an accurate code
   * and status instead of a generic 500.
   */
  private static toScanError(err: any, fallbackMessage: string): Error {
    if (err instanceof VirusTotalError) return err;
    if (err instanceof AppError) return err;
    return new AppError('SCAN_FAILED', fallbackMessage, 502);
  }

  static async createUrlScan(userId: string, url: string): Promise<ScanRecord> {
    const apiKey = await this.getEffectiveKey(userId);
    const scanId = crypto.randomUUID();
    const now = new Date().toISOString();

    const initialRecord: ScanRecord = {
      id: scanId,
      user_id: userId,
      type: 'url',
      item_label: url,
      state: 'queued',
      created_at: now,
      item_meta: { url },
    };

    await this.saveScan(initialRecord);

    // ---- Fast path: URL-report-first lookup --------------------------------
    // Same idea as the file flow: if VirusTotal already has a recent report for
    // this URL, return it immediately instead of submitting + waiting ~30s.
    try {
      const urlId = Buffer.from(url).toString('base64url');
      const existing = await vtClient.getUrlReport(apiKey, urlId);
      const attrs = existing?.data?.attributes;
      // Only reuse a reasonably fresh report (≤ 7 days). Older reports are
      // submitted for a fresh analysis so the user isn't shown stale verdicts.
      const analyzedAt = attrs?.last_analysis_date
        ? attrs.last_analysis_date * 1000
        : 0;
      const isFresh = analyzedAt > 0 && Date.now() - analyzedAt < 7 * 24 * 60 * 60 * 1000;
      if (attrs?.last_analysis_results && isFresh) {
        const vendor_results = mapVendorResults(attrs.last_analysis_results);
        // Laporan "fresh" tapi tanpa engine bukan hasil yang bisa dipercaya;
        // jatuh ke jalur submit agar VT menganalisis ulang.
        if (hasVendorData(vendor_results)) {
          const stats = aggregateStats(vendor_results);
          const settings = await SettingsService.getSettings(userId);
          const verdict = calculateVerdict(stats, settings.danger_threshold);

          const completed = {
            state: 'completed' as const,
            verdict,
            stats,
            vendor_results,
            item_meta: {
              url,
              final_url: attrs.url,
              title: attrs.title,
              http_response_code: attrs.last_http_response_code,
              categories: attrs.categories,
              last_analysis_date: attrs.last_analysis_date,
            },
            raw_payload: existing.data,
            completed_at: new Date().toISOString(),
          };

          await this.updateScan(scanId, completed);
          return { ...initialRecord, ...completed };
        }
      }
    } catch (err) {
      if (!(err instanceof VirusTotalError && err.code === 'NOT_FOUND')) {
        logger.warn({ err }, 'URL report pre-check failed; falling back to submit');
      }
    }

    try {
      const res = await vtClient.submitUrl(apiKey, url);
      initialRecord.vt_analysis_id = res.id;
      initialRecord.state = 'in_progress';
      await this.updateScan(scanId, {
        vt_analysis_id: res.id,
        state: 'in_progress',
      });
    } catch (err: any) {
      // No fabricated fallback: mark failed and surface the real error.
      logger.warn({ err }, 'URL submission to VirusTotal failed');
      await this.updateScan(scanId, { state: 'failed' });
      initialRecord.state = 'failed';
      throw this.toScanError(err, 'URL submission to VirusTotal failed');
    }

    return initialRecord;
  }

  static async createHashScan(userId: string, hash: string): Promise<ScanRecord> {
    const apiKey = await this.getEffectiveKey(userId);
    const cleanHash = hash.trim().toLowerCase();
    const scanId = crypto.randomUUID();
    const now = new Date().toISOString();

    const initialRecord: ScanRecord = {
      id: scanId,
      user_id: userId,
      type: 'hash',
      item_label: cleanHash,
      item_sha256: cleanHash.length === 64 ? cleanHash : null,
      state: 'queued',
      created_at: now,
    };

    await this.saveScan(initialRecord);

    // Cache check for hash scan: reuse a previous VT report if still valid.
    if (cleanHash.length === 64) {
      const cachedHash = vtHashCache.get(cleanHash);
      if (cachedHash) {
        logger.info({ hash: cleanHash }, 'Hash scan served from cache');
        return cachedHash;
      }
    }

    try {
      const res = await vtClient.getFileReport(apiKey, cleanHash);
      const attrs = res?.data?.attributes || {};
      // Vendor hasil langsung dari VirusTotal (data asli, tanpa padding).
      const vendor_results = mapVendorResults(attrs.last_analysis_results);
      // VT kadang mengembalikan objek file tanpa hasil engine sama sekali
      // (baru diunggah, analisis belum jalan). Itu BUKAN "clean" — laporkan
      // sebagai not_found agar UI jujur menampilkan belum ada hasil.
      if (!hasVendorData(vendor_results)) {
        await this.updateScan(scanId, { state: 'not_found' });
        initialRecord.state = 'not_found';
        return initialRecord;
      }
      const stats = aggregateStats(vendor_results);
      const settings = await SettingsService.getSettings(userId);
      const verdict = calculateVerdict(stats, settings.danger_threshold);

      const updated = {
        state: 'completed' as const,
        verdict,
        stats,
        vendor_results,
        item_sha256: attrs.sha256 || initialRecord.item_sha256,
        item_meta: {
          size: attrs.size,
          type_description: attrs.type_description,
          names: attrs.names,
          md5: attrs.md5,
          sha1: attrs.sha1,
          sha256: attrs.sha256,
          first_submission_date: attrs.first_submission_date,
          last_analysis_date: attrs.last_analysis_date,
        },
        raw_payload: res.data,
        completed_at: new Date().toISOString(),
      };

      await this.updateScan(scanId, updated);
      // Populate cache so future identical hashes skip the VT call.
      if (cleanHash.length === 64) vtHashCache.set(cleanHash, { ...initialRecord, ...updated });
      return { ...initialRecord, ...updated };
    } catch (err: any) {
      if (err instanceof VirusTotalError && err.code === 'NOT_FOUND') {
        await this.updateScan(scanId, { state: 'not_found' });
        initialRecord.state = 'not_found';
        return initialRecord;
      }

      // No fabricated fallback: mark failed and surface the real error.
      logger.warn({ err }, 'Hash lookup on VirusTotal failed');
      await this.updateScan(scanId, { state: 'failed' });
      initialRecord.state = 'failed';
      throw this.toScanError(err, 'Hash lookup on VirusTotal failed');
    }
  }

  static async getScanStatus(
    userId: string,
    scanId: string
  ): Promise<{ state: string; progressLabel: string; verdict?: string | null }> {
    const scan = await this.getScanRecord(userId, scanId);
    if (!scan) {
      throw new AppError('NOT_FOUND', 'Scan not found', 404);
    }

    if (scan.state === 'completed' || scan.state === 'not_found' || scan.state === 'failed') {
      return {
        state: scan.state,
        progressLabel: scan.state === 'completed' ? 'Analysis Complete' : 'Completed',
        verdict: scan.verdict,
      };
    }

    if (scan.state === 'timeout' || scan.state === 'cancelled') {
      return {
        state: scan.state,
        progressLabel: 'Completed',
        verdict: scan.verdict,
      };
    }

    const now = Date.now();

    // ---- Reaper: jangan biarkan scan menggantung selamanya ------------------
    // Kalau user menutup tab sebelum analisis selesai, tidak ada yang memanggil
    // endpoint ini lagi dan scan tertinggal `in_progress` permanen. Scan seperti
    // itu tetap terhitung di Total Scans tapi tidak pernah masuk bucket mana
    // pun, dan UI akan berputar tanpa akhir kalau dibuka kembali. Setelah
    // melewati ambang, tandai `timeout` supaya jadi hasil final yang jujur.
    // Cek dilakukan SEBELUM memanggil VT agar scan basi tidak membakar kuota.
    const maxAgeMs = env.VT_SCAN_MAX_AGE_MS || 30 * 60 * 1000;
    // Ukur dari aktivitas TERAKHIR, bukan created_at: `rescan` memakai ulang
    // record lama, jadi created_at bisa berhari-hari lalu dan scan yang baru
    // saja di-rescan akan langsung di-timeout kalau patokannya created_at.
    const lastActivity = Math.max(
      new Date(scan.created_at).getTime(),
      scan.last_polled_at ? new Date(scan.last_polled_at).getTime() : 0
    );
    const age = now - lastActivity;
    if (age > maxAgeMs) {
      logger.warn(
        { scanId, ageMs: age, state: scan.state },
        'Scan exceeded max age while unresolved — marking timeout'
      );
      await this.updateScan(scanId, { state: 'timeout' });
      return {
        state: 'timeout',
        progressLabel: 'Completed',
        verdict: scan.verdict,
      };
    }

    // Polling VT if vt_analysis_id exists
    const lastPolled = scan.last_polled_at ? new Date(scan.last_polled_at).getTime() : 0;
    // Jeda polling diturunkan dari kuota VirusTotal, bukan angka mati 15s.
    // Dengan kuota gratis 4 req/menit → 15s (tetap aman). Kalau key berbayar
    // (mis. 500 req/menit) → 3s, sehingga hasil muncul jauh lebih cepat tanpa
    // melanggar kuota. `VT_POLL_INTERVAL_MS` bisa menimpanya secara eksplisit.
    const pollIntervalMs = Math.max(
      3000,
      env.VT_POLL_INTERVAL_MS || Math.ceil(60000 / Math.max(1, env.VT_RATE_LIMIT_PER_MIN))
    );
    const canPollVT = now - lastPolled >= pollIntervalMs;

    if (scan.vt_analysis_id && canPollVT) {
      try {
        // Catat waktu polling SEBELUM memanggil VirusTotal. Kalau panggilan
        // gagal (jaringan/404 sesaat setelah upload), throttle tetap berlaku
        // sehingga polling klien yang cepat tidak menembak VT berulang-ulang
        // dan menghabiskan kuota.
        await this.updateScan(scanId, { last_polled_at: new Date().toISOString() });
        const apiKey = await this.getEffectiveKey(userId);

        // ---- File: satu panggilan, data penuh -------------------------------
        // Sebelumnya setiap penyelesaian butuh DUA panggilan: `/analyses/{id}`
        // lalu `/files/{hash}` untuk laporan lengkap. Itu memakan 2 jatah kuota
        // sekaligus dan memperlambat hasil. Untuk file kita sudah tahu hash-nya,
        // jadi langsung ambil laporan file: satu panggilan, dan datanya sudah
        // lengkap (semua engine yang dilaporkan VT).
        if (scan.type === 'file' && scan.item_sha256) {
          const fileRes = await vtClient.getFileReport(apiKey, scan.item_sha256);
          const fileAttrs = fileRes?.data?.attributes || {};

          const vendors = mapVendorResults(fileAttrs.last_analysis_results);
          // Hasil dianggap siap hanya jika (a) VT sudah melaporkan engine, dan
          // (b) analisisnya baru — bukan laporan lama dari sebelum scan ini.
          // Tanpa (b), tombol "Rescan" akan langsung menampilkan hasil usang.
          const analyzedAtMs = (fileAttrs.last_analysis_date || 0) * 1000;
          const scanStartedMs = new Date(scan.created_at).getTime();
          const isFreshEnough = analyzedAtMs >= scanStartedMs - 120_000;

          if (hasVendorData(vendors) && isFreshEnough) {
            const stats = aggregateStats(vendors);
            const settings = await SettingsService.getSettings(userId);
            const verdict = calculateVerdict(stats, settings.danger_threshold);

            await this.updateScan(scanId, {
              state: 'completed',
              verdict,
              stats,
              vendor_results: vendors,
              item_sha256: fileAttrs.sha256 ?? scan.item_sha256,
              item_meta: {
                ...(scan.item_meta || {}),
                size: fileAttrs.size ?? scan.item_meta?.size,
                type_description:
                  fileAttrs.type_description ?? scan.item_meta?.type_description,
                names: fileAttrs.names ?? scan.item_meta?.names,
                md5: fileAttrs.md5 ?? scan.item_meta?.md5,
                sha1: fileAttrs.sha1 ?? scan.item_meta?.sha1,
                sha256: fileAttrs.sha256 ?? scan.item_sha256,
                first_submission_date:
                  fileAttrs.first_submission_date ?? scan.item_meta?.first_submission_date,
                last_analysis_date:
                  fileAttrs.last_analysis_date ?? scan.item_meta?.last_analysis_date,
              },
              raw_payload: fileRes.data,
              completed_at: new Date().toISOString(),
            });

            return {
              state: 'completed',
              progressLabel: 'Analysis Complete',
              verdict,
            };
          }

          await this.updateScan(scanId, { state: 'in_progress' });
          return { state: 'in_progress', progressLabel: 'Analyzing...' };
        }

        const res = await vtClient.getAnalysis(apiKey, scan.vt_analysis_id);
        const attrs = res?.data?.attributes;

        if (attrs?.status === 'completed') {
          // Ambil hasil vendor asli dari VirusTotal + stats.
          let vendor_results = mapVendorResults(attrs.results);
          let stats = aggregateStats(vendor_results);

          let itemMeta = scan.item_meta || {};
          let sha256 = scan.item_sha256;
          let rawData = res.data;

          // Untuk URL: endpoint /analyses sering hanya mengembalikan sebagian
          // engine. Ambil laporan URL penuh agar seluruh engine yang dilaporkan
          // VirusTotal ikut terhitung.
          if (scan.type === 'url' && scan.item_label) {
            try {
              const urlId = Buffer.from(scan.item_label).toString('base64url');
              const urlRes = await vtClient.getUrlReport(apiKey, urlId);
              const urlAttrs = urlRes?.data?.attributes || {};
              const urlVendors = mapVendorResults(urlAttrs.last_analysis_results);
              vendor_results = urlVendors;
              stats = aggregateStats(urlVendors);
              rawData = urlRes.data ?? rawData;
              itemMeta = {
                ...itemMeta,
                url: scan.item_label,
                final_url: urlAttrs.url,
                title: urlAttrs.title,
                http_response_code: urlAttrs.last_http_response_code,
                categories: urlAttrs.categories,
                last_analysis_date: urlAttrs.last_analysis_date,
              };
            } catch (urlErr) {
              logger.warn({ urlErr }, 'Failed to fetch full URL report; using analysis results');
            }
          }

          // Untuk file: lengkapi metadata dari meta.file_info.
          if (res.meta?.file_info?.sha256) {
            sha256 = res.meta.file_info.sha256;
            itemMeta = { ...itemMeta, ...res.meta.file_info };
          }

          // Tidak ada satu pun engine yang dilaporkan = VT belum punya hasil.
          // Jangan pernah menyebutnya "clean"; biarkan status tetap berjalan
          // supaya polling berikutnya mengambil hasil yang sebenarnya.
          if (!hasVendorData(vendor_results)) {
            await this.updateScan(scanId, { state: 'in_progress' });
            return { state: 'in_progress', progressLabel: 'Analyzing...' };
          }

          const settings = await SettingsService.getSettings(userId);
          const verdict = calculateVerdict(stats, settings.danger_threshold);

          await this.updateScan(scanId, {
            state: 'completed',
            verdict,
            stats,
            vendor_results,
            item_sha256: sha256,
            item_meta: itemMeta,
            raw_payload: rawData,
            completed_at: new Date().toISOString(),
          });

          return {
            state: 'completed',
            progressLabel: 'Analysis Complete',
            verdict,
          };
        } else if (attrs?.status === 'in-progress') {
          await this.updateScan(scanId, { state: 'in_progress' });
          return { state: 'in_progress', progressLabel: 'Analyzing...' };
        }
      } catch (err) {
        logger.warn({ err }, 'Error during VT analysis polling');
      }
    }

    // Determine current progress label
    let progressLabel = 'Uploading file...';
    if (scan.type === 'hash') progressLabel = 'Looking up hash...';
    else if (scan.state === 'queued') progressLabel = 'Queued...';
    else if (scan.state === 'in_progress') progressLabel = 'Analyzing...';

    return {
      state: scan.state,
      progressLabel,
      verdict: scan.verdict,
    };
  }

  static async getScanDetails(userId: string, scanId: string): Promise<ScanRecord> {
    const scan = await this.getScanRecord(userId, scanId);
    if (!scan) {
      throw new AppError('NOT_FOUND', 'Scan not found', 404);
    }
    return scan;
  }

  static async rescan(userId: string, scanId: string): Promise<{ scanId: string }> {
    const scan = await this.getScanRecord(userId, scanId);
    if (!scan) {
      throw new AppError('NOT_FOUND', 'Scan not found', 404);
    }

    const apiKey = await this.getEffectiveKey(userId);

    if (scan.type === 'file' && scan.item_sha256) {
      try {
        const res = await vtClient.rescanFile(apiKey, scan.item_sha256);
        await this.updateScan(scanId, {
          vt_analysis_id: res.id,
          state: 'queued',
          verdict: null,
          // Reset the reaper clock: this is a NEW analysis of an old record.
          last_polled_at: new Date().toISOString(),
        });
      } catch (err) {
        logger.warn({ err }, 'Rescan file failed');
      }
    } else if (scan.type === 'url' && scan.item_label) {
      try {
        const urlId = Buffer.from(scan.item_label).toString('base64url');
        const res = await vtClient.rescanUrl(apiKey, urlId);
        await this.updateScan(scanId, {
          vt_analysis_id: res.id,
          state: 'queued',
          verdict: null,
          // Reset the reaper clock: this is a NEW analysis of an old record.
          last_polled_at: new Date().toISOString(),
        });
      } catch (err) {
        logger.warn({ err }, 'Rescan url failed');
      }
    }

    return { scanId };
  }

  private static async getScanRecord(
    userId: string,
    scanId: string
  ): Promise<ScanRecord | null> {
    // 1. Cek memoryStore (cepat, handal, anti gagal untuk guest scan).
    //    PENTING: memoryStore bersifat GLOBAL (dibagi semua sesi anonim), jadi
    //    kepemilikan scan WAJIB diverifikasi lewat `user_id`. Tanpa cek ini,
    //    siapa pun yang menebak `scanId` bisa membaca scan sesi lain (IDOR).
    const memScan = memoryStore.scans.get(scanId);
    if (memScan && memScan.user_id === userId) {
      return memScan;
    }

    // 2. Cek Supabase jika tersedia — filter juga berdasarkan user_id.
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('scans')
          .select('*')
          .eq('id', scanId)
          .eq('user_id', userId)
          .maybeSingle();

        if (!error && data) {
          memoryStore.scans.set(scanId, data as ScanRecord);
          return data as ScanRecord;
        }
      } catch {
        // Abaikan error format UUID / database
      }
    }

    return null;
  }

  private static async saveScan(scan: ScanRecord): Promise<void> {
    assertConsistentStats(scan.stats, scan.vendor_results);

    // Selalu simpan ke memoryStore agar scan selalu ditemukan
    memoryStore.scans.set(scan.id, scan);

    if (supabase) {
      try {
        await supabase.from('scans').insert(scan);
      } catch {
        // Abaikan error constraint Supabase jika guest
      }
    }
  }

  private static async updateScan(
    scanId: string,
    updates: Partial<ScanRecord>
  ): Promise<void> {
    // Guard: `stats` and `vendor_results` are written together, and the UI
    // renders both side by side ("5 / N Vendor" plus the engine cards). If the
    // totals disagree the report is self-contradictory, which is exactly the
    // bug that produced rows showing 90 engines next to 71 vendor cards.
    // Both fields must always be derived from the same vendor list.
    if (updates.stats && Array.isArray(updates.vendor_results)) {
      assertConsistentStats(updates.stats, updates.vendor_results);
    }

    const existing = memoryStore.scans.get(scanId);
    if (existing) {
      memoryStore.scans.set(scanId, { ...existing, ...updates });
    }

    if (supabase) {
      try {
        await supabase.from('scans').update(updates).eq('id', scanId);
      } catch {
        // Abaikan error constraint Supabase
      }
    }
  }
}
