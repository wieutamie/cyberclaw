import { supabase, memoryStore } from "../lib/supabase.js";
import { ScanRecord } from "../types/index.js";
import { SettingsService } from "./settings.service.js";
import { classifyScan, ScanBucket, toDonutSlices } from "../lib/analyticsBuckets.js";

export interface AnalyticsResponse {
  kpi: {
    totalScans: number;
    danger: number;
    warning: number;
    clean: number;
    notFound: number;
    failed: number;
    pending: number;
  };
  donut: {
    /** Stable i18n key suffix: danger | warning | clean | undetected. */
    key: 'danger' | 'warning' | 'clean' | 'undetected';
    /** English fallback label (non-i18n API consumers). */
    name: string;
    value: number;
    color: string;
    /** Only populated for the merged `undetected` slice. */
    breakdown: null | { notFound: number; pending: number; failed: number };
  }[];
  daily: {
    date: string;
    total: number;
    danger: number;
    warning: number;
    clean: number;
    notFound: number;
    pending: number;
    failed: number;
  }[];
  recent: ScanRecord[];
}

const DAY_MS = 86_400_000;

/**
 * Returns a YYYY-MM-DD day key for the given date in the user's timezone.
 * The "en-CA" locale always outputs Y-M-D, so keys sort lexicographically.
 */
function tzDateKey(date: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    // Unknown IANA identifier -> fall back to UTC days
    return date.toISOString().split("T")[0];
  }
}

export class AnalyticsService {
  static async getAnalytics(
    userId: string,
    range: "7d" | "30d" | "90d" = "30d"
  ): Promise<AnalyticsResponse> {
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const now = Date.now();

    // Daily buckets are keyed on the user's timezone so "today" on the chart
    // matches the user's local calendar day (UTC buckets would shift scans
    // into the wrong day for users who are not on UTC).
    let tz = "UTC";
    try {
      const settings = await SettingsService.getSettings(userId);
      if (settings?.timezone) tz = settings.timezone;
    } catch {
      // fall back to UTC buckets
    }

    // Coarse pre-filter: tz offsets are at most +/-14h from UTC, so one extra
    // day of margin is always enough; the exact tz-aware range is enforced below.
    const marginIso = new Date(now - (days + 1) * DAY_MS).toISOString();

    let allUserScans: ScanRecord[] = [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("scans")
          .select("*")
          .eq("user_id", userId)
          .gte("created_at", marginIso)
          .order("created_at", { ascending: false });

        // Only fall back to memoryStore on a REAL query error. An empty result
        // is a valid answer (the user may simply have no scans in range) and
        // must NOT be replaced by stale in-memory data — that would make the
        // totals jump around between requests.
        if (!error) {
          allUserScans = (data || []) as ScanRecord[];
        }
      } catch {
        // Fallback to memoryStore
      }
    }

    if (!supabase) {
      allUserScans = Array.from(memoryStore.scans.values())
        .filter((s) => s.user_id === userId && s.created_at >= marginIso)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    // Exact tz-aware range: keep only scans whose local day (in the user's
    // timezone) falls within the last `days` days.
    const oldestKey = tzDateKey(new Date(now - (days - 1) * DAY_MS), tz);
    allUserScans = allUserScans.filter(
      (s) => tzDateKey(new Date(s.created_at), tz) >= oldestKey
    );

    // Every scan must land in exactly ONE bucket, so that
    // danger + warning + clean + notFound + failed + pending === totalScans.
    // Previously `failed` and `in_progress` scans were counted in totalScans
    // but fell through every branch, so the donut (which sums its own slices)
    // showed a smaller total than the KPI card above it.
    const buckets = {
      danger: 0,
      warning: 0,
      clean: 0,
      notFound: 0,
      failed: 0,
      pending: 0,
    };

    type DayCounts = {
      total: number;
      danger: number;
      warning: number;
      clean: number;
      notFound: number;
      pending: number;
      failed: number;
    };

    // Date grouping map
    const dailyMap = new Map<string, DayCounts>();

    // Pre-populate all days in range (user-tz day keys) with 0
    for (let i = days - 1; i >= 0; i--) {
      const key = tzDateKey(new Date(now - i * DAY_MS), tz);
      if (!dailyMap.has(key)) {
        dailyMap.set(key, {
          total: 0,
          danger: 0,
          warning: 0,
          clean: 0,
          notFound: 0,
          pending: 0,
          failed: 0,
        });
      }
    }

    for (const scan of allUserScans) {
      // Classify exactly once via the shared pure helper, so this rule is
      // unit-tested and cannot drift from the bucket list below.
      const bucket: ScanBucket = classifyScan(scan);

      buckets[bucket]++;

      const dateKey = tzDateKey(new Date(scan.created_at), tz);
      const entry = dailyMap.get(dateKey);
      if (entry) {
        entry.total++;
        if (bucket === "danger") entry.danger++;
        else if (bucket === "warning") entry.warning++;
        else if (bucket === "clean") entry.clean++;
        else if (bucket === "notFound") entry.notFound++;
        else if (bucket === "failed") entry.failed++;
        else entry.pending++;
      }
    }

    const daily = Array.from(dailyMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    // The donut follows the UI mockup: four slices only. The three
    // "no verdict yet" buckets (notFound / pending / failed) are merged into
    // a single `undetected` slice, which is what the mockup legend shows.
    // `name` stays as an English fallback for non-i18n consumers and API
    // clients; the client renders `t('analytics.slice.' + key)` instead.
    // `breakdown` keeps the individual counts so the tooltip can still expose
    // exactly how the merged slice was composed (no data is lost).
    // `toDonutSlices` is the single source of truth for this mapping and is
    // unit-tested against the "slices sum === total" invariant.
    const donut = toDonutSlices(buckets);

    const totalScans = allUserScans.length;

    // Invariant: the donut centre reads its own slice sum, so it must match
    // the Total Scans KPI exactly. If a future ScanState is added without a
    // bucket, this fires instead of silently under-reporting again.
    const bucketSum =
      buckets.danger +
      buckets.warning +
      buckets.clean +
      buckets.notFound +
      buckets.failed +
      buckets.pending;
    if (bucketSum !== totalScans) {
      throw new Error(
        `Analytics bucket mismatch: ${bucketSum} classified vs ${totalScans} total`
      );
    }

    // Same invariant per day: the line chart stacks these series, so a day
    // whose parts don't add up to `total` would draw a misleading curve.
    for (const d of daily) {
      const daySum =
        d.danger + d.warning + d.clean + d.notFound + d.pending + d.failed;
      if (daySum !== d.total) {
        throw new Error(
          `Analytics daily mismatch on ${d.date}: ${daySum} classified vs ${d.total} total`
        );
      }
    }

    return {
      kpi: {
        totalScans,
        danger: buckets.danger,
        warning: buckets.warning,
        clean: buckets.clean,
        notFound: buckets.notFound,
        failed: buckets.failed,
        pending: buckets.pending,
      },
      donut,
      daily,
      recent: allUserScans.slice(0, 10),
    };
  }
}