import { supabase, memoryStore } from '../lib/supabase.js';
import { ScanRecord } from '../types/index.js';

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

export class AnalyticsService {
  static async getAnalytics(
    userId: string,
    range: '7d' | '30d' | '90d' = '30d'
  ): Promise<AnalyticsResponse> {
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const sinceIso = sinceDate.toISOString();

    let allUserScans: ScanRecord[] = [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('scans')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', sinceIso)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          allUserScans = data as ScanRecord[];
        }
      } catch {
        // Fallback to memoryStore
      }
    }

    if (allUserScans.length === 0) {
      allUserScans = Array.from(memoryStore.scans.values())
        .filter((s) => s.user_id === userId && s.created_at >= sinceIso)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    let dangerCount = 0;
    let warningCount = 0;
    let cleanCount = 0;
    let notFoundCount = 0;

    // Date grouping map
    const dailyMap = new Map<
      string,
      { total: number; danger: number; warning: number; clean: number }
    >();

    // Pre-populate all days in range with 0
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      dailyMap.set(dateKey, { total: 0, danger: 0, warning: 0, clean: 0 });
    }

    for (const scan of allUserScans) {
      if (scan.verdict === 'danger') dangerCount++;
      else if (scan.verdict === 'warning') warningCount++;
      else if (scan.verdict === 'clean') cleanCount++;
      else if (scan.state === 'not_found') notFoundCount++;

      const dateKey = scan.created_at.split('T')[0];
      if (dailyMap.has(dateKey)) {
        const entry = dailyMap.get(dateKey)!;
        entry.total++;
        if (scan.verdict === 'danger') entry.danger++;
        else if (scan.verdict === 'warning') entry.warning++;
        else if (scan.verdict === 'clean') entry.clean++;
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
        { name: 'Danger', value: dangerCount, color: '#FF0000' },
        { name: 'Warning', value: warningCount, color: '#FF7300' },
        { name: 'Clean', value: cleanCount, color: '#11FF00' },
        { name: 'Not Found', value: notFoundCount, color: '#64748B' },
      ],
      daily,
      recent: allUserScans.slice(0, 10),
    };
  }
}
