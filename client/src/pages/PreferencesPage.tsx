import React from 'react';
import { useTranslation } from 'react-i18next';
import { GeneralPreferences } from '../components/preferences/PreferencesForms.js';

export const PreferencesPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="animate-fade-rise">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {t('preferences.title')}
        </h1>
        <p className="text-xs text-muted mt-1">
          {t('preferences.subtitle')}
        </p>
      </div>

      <div className="animate-fade-rise pt-2">
        <GeneralPreferences />
      </div>
    </div>
  );
};
