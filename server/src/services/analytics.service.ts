import { supabase, memoryStore } from "../lib/supabase.js";
import { ScanRecord } from "../types/index.js";
import { SettingsService } from "./settings.service.js";

export interface AnalyticsResponse {
  kpi: {
    totalScans: number;
    danger: number;
    warning: number;
    clean: number;
  };
  donut: {
    name: string;
    value: number;
    color: string;
  }[];
  daily: {
    date: string;
    total: number;
    danger: number;
    warning: number;
    clean: number;
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

        if (!error && data && data.length > 0) {
          allUserScans = data as ScanRecord[];
        }
      } catch {
        // Fallback to memoryStore
      }
    }

    if (allUserScans.length === 0) {
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

    let dangerCount = 0;
    let warningCount = 0;
    let cleanCount = 0;
    let notFoundCount = 0;

    // Date grouping map
    const dailyMap = new Map<
      string,
      { total: number; danger: number; warning: number; clean: number }
    >();

    // Pre-populate all days in range (user-tz day keys) with 0
    for (let i = days - 1; i >= 0; i--) {
      const key = tzDateKey(new Date(now - i * DAY_MS), tz);
      if (!dailyMap.has(key)) {
        dailyMap.set(key, { total: 0, danger: 0, warning: 0, clean: 0 });
      }
    }

    for (const scan of allUserScans) {
      if (scan.verdict === "danger") dangerCount++;
      else if (scan.verdict === "warning") warningCount++;
      else if (scan.verdict === "clean") cleanCount++;
      else if (scan.state === "not_found") notFoundCount++;

      const dateKey = tzDateKey(new Date(scan.created_at), tz);
      if (dailyMap.has(dateKey)) {
        const entry = dailyMap.get(dateKey)!;
        entry.total++;
        if (scan.verdict === "danger") entry.danger++;
        else if (scan.verdict === "warning") entry.warning++;
        else if (scan.verdict === "clean") entry.clean++;
      }
    }

    const daily = Array.from(dailyMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    return {
      kpi: {
        totalScans: allUserScans.length,
        danger: dangerCount,
        warning: warningCount,
        clean: cleanCount,
      },
      donut: [
        { name: "Danger", value: dangerCount, color: "#FF0000" },
        { name: "Warning", value: warningCount, color: "#FF7300" },
        { name: "Clean", value: cleanCount, color: "#11FF00" },
        { name: "Not Found", value: notFoundCount, color: "#64748B" },
      ],
      daily,
      recent: allUserScans.slice(0, 10),
    };
  }
}