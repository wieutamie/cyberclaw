import { supabase, memoryStore } from '../lib/supabase.js';
import { UserSettings } from '../types/index.js';

const DEFAULT_SETTINGS: Omit<UserSettings, 'user_id' | 'updated_at'> = {
  timezone: 'Asia/Jakarta',
  date_format: 'DD/MM/YYYY',
  time_format: '24h',
  language: 'id',
  default_tab: 'file',
  danger_threshold: 3,
  show_upload_warning: true,
  auto_open_report: false,
  history_retention_days: 90,
};

export class SettingsService {
  static async getSettings(userId: string): Promise<UserSettings> {
    if (supabase) {
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) return data as UserSettings;

      // Create default
      const newSettings: UserSettings = {
        user_id: userId,
        ...DEFAULT_SETTINGS,
        updated_at: new Date().toISOString(),
      };
      await supabase.from('user_settings').insert(newSettings);
      return newSettings;
    } else {
      let settings = memoryStore.userSettings.get(userId);
      if (!settings) {
        settings = {
          user_id: userId,
          ...DEFAULT_SETTINGS,
          updated_at: new Date().toISOString(),
        };
        memoryStore.userSettings.set(userId, settings);
      }
      return settings;
    }
  }

  static async updateSettings(
    userId: string,
    updates: Partial<UserSettings>
  ): Promise<UserSettings> {
    const now = new Date().toISOString();
    const current = await this.getSettings(userId);
    const merged: UserSettings = {
      ...current,
      ...updates,
      user_id: userId,
      updated_at: now,
    };

    if (supabase) {
      await supabase.from('user_settings').upsert(merged);
    } else {
      memoryStore.userSettings.set(userId, merged);
    }

    return merged;
  }
}
