import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';
import { UserSettings } from '../types/index.js';

interface SettingsContextType {
  settings: UserSettings;
  loading: boolean;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
}

const defaultSettings: UserSettings = {
  user_id: 'default',
  timezone: 'Asia/Jakarta',
  date_format: 'DD/MM/YYYY',
  time_format: '24h',
  language: 'en',
  default_tab: 'file',
  danger_threshold: 3,
  show_upload_warning: true,
  auto_open_report: false,
  history_retention_days: 90,
  updated_at: new Date().toISOString(),
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await api.getSettings();
        setSettings(data);
        const lang = data.language ? data.language.toLowerCase().split('-')[0] : undefined;
        if (lang && lang !== i18n.language) {
          i18n.changeLanguage(lang);
          localStorage.setItem('cyberclaw_language', lang);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [i18n]);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    try {
      const updated = await api.updateSettings(updates);
      setSettings(updated);
      const lang = updates.language ? updates.language.toLowerCase().split('-')[0] : undefined;
      if (lang && lang !== i18n.language) {
        i18n.changeLanguage(lang);
        localStorage.setItem('cyberclaw_language', lang);
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
      throw err;
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        updateSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
}
