import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sliders, Key } from 'lucide-react';
import { GeneralPreferences, ApiKeyPreferences } from '../components/preferences/PreferencesForms.js';

export const PreferencesPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'general';

  const setTab = (tab: 'general' | 'api-keys') => {
    setSearchParams({ tab });
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="animate-fade-rise">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {t('preferences.title')}
        </h1>
        <p className="text-xs text-muted mt-1">
          Kelola profil akun, format tampilan tanggal, zona waktu, dan VirusTotal API Key Anda.
        </p>
      </div>

      {/* Sub-Tabs Header */}
      <div className="animate-fade-rise [animation-delay:60ms] flex items-center gap-2 border-b border-surface-alt">
        <button
          onClick={() => setTab('general')}
          className={`relative flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all group ${
            activeTab === 'general'
              ? 'text-white border-b-2 border-brand'
              : 'text-muted hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
          <span>{t('preferences.tabGeneral')}</span>
        </button>

        <button
          onClick={() => setTab('api-keys')}
          className={`relative flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all group ${
            activeTab === 'api-keys'
              ? 'text-white border-b-2 border-brand'
              : 'text-muted hover:text-white'
          }`}
        >
          <Key className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
          <span>{t('preferences.tabApiKeys')}</span>
        </button>
      </div>

      {/* Tab Content */}
      <div key={activeTab} className="animate-fade-rise pt-2">
        {activeTab === 'general' && <GeneralPreferences />}
        {activeTab === 'api-keys' && <ApiKeyPreferences />}
      </div>
    </div>
  );
};
