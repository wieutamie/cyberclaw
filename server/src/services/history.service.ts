import { supabase, memoryStore } from '../lib/supabase.js';
import { ScanRecord, ScanType, Verdict } from '../types/index.js';

export interface HistoryQueryParams {
  page?: number;
  pageSize?: number;
  q?: string;
  type?: ScanType;
  verdict?: Verdict;
}

export class HistoryService {
  static async getHistory(
    userId: string,
    params: HistoryQueryParams
  ): Promise<{ items: ScanRecord[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, Math.min(100, params.pageSize || 10));
    const offset = (page - 1) * pageSize;

    if (supabase) {
      try {
        let query = supabase
          .from('scans')
          .select('*', { count: 'exact' })
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (params.type) {
          query = query.eq('type', params.type);
        }
        if (params.verdict) {
          query = query.eq('verdict', params.verdict);
        }
        if (params.q) {
          query = query.ilike('item_label', `%${params.q}%`);
        }

        query = query.range(offset, offset + pageSize - 1);

        const { data, count, error } = await query;
        if (!error && data && data.length > 0) {
          return {
            items: data as ScanRecord[],
            total: count || data.length,
            page,
            pageSize,
          };
        }
      } catch {
        // Fallback to memoryStore
      }
    }

    // Local / Guest fallback from memoryStore
      let list = Array.from(memoryStore.scans.values()).filter(
        (s) => s.user_id === userId
      );

      if (params.type) {
        list = list.filter((s) => s.type === params.type);
      }
      if (params.verdict) {
        list = list.filter((s) => s.verdict === params.verdict);
      }
      if (params.q) {
        const q = params.q.toLowerCase();
        list = list.filter((s) => s.item_label.toLowerCase().includes(q));
      }

      list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const total = list.length;
      const items = list.slice(offset, offset + pageSize);

      return { items, total, page, pageSize };
  }

  static async deleteScan(userId: string, scanId: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase
        .from('scans')
        .delete()
        .eq('id', scanId)
        .eq('user_id', userId);
      return !error;
    } else {
      const scan = memoryStore.scans.get(scanId);
      if (scan && scan.user_id === userId) {
        memoryStore.scans.delete(scanId);
        return true;
      }
      return false;
    }
  }

  static async clearAllHistory(userId: string): Promise<void> {
    if (supabase) {
      await supabase.from('scans').delete().eq('user_id', userId);
    } else {
      for (const [id, scan] of memoryStore.scans.entries()) {
        if (scan.user_id === userId) {
          memoryStore.scans.delete(id);
        }
      }
    }
  }

  static async exportCsv(userId: string): Promise<string> {
    let list: ScanRecord[] = [];
    if (supabase) {
      const { data } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      list = (data || []) as ScanRecord[];
    } else {
      list = Array.from(memoryStore.scans.values())
        .filter((s) => s.user_id === userId)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    const headers = ['ID', 'Timestamp', 'Type', 'Item Label', 'Verdict', 'State', 'Malicious', 'Total Engines', 'SHA256'];
    const rows = list.map((s) => {
      const mal = s.stats?.malicious ?? 0;
      const totalEng = s.stats
        ? s.stats.malicious + s.stats.suspicious + s.stats.harmless + s.stats.undetected
        : 0;
      return [
        s.id,
        s.created_at,
        s.type,
        `"${(s.item_label || '').replace(/"/g, '""')}"`,
        s.verdict || s.state,
        s.state,
        mal,
        totalEng,
        s.item_sha256 || '',
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
