import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import idTranslation from './locales/id.json';
import enTranslation from './locales/en.json';
import { DEFAULT_LANGUAGE, LANGUAGE_CODES } from '../lib/languages.js';

// English is the default and fallback language. A user's explicit choice
// (persisted in localStorage) still wins so the Preferences language switch
// keeps working. Languages without a translation bundle fall back to English
// key-by-key via `fallbackLng`.
function resolveInitialLanguage(): string {
  const saved = localStorage.getItem('cyberclaw_language');
  if (saved) {
    const base = saved.toLowerCase().split('-')[0];
    if (LANGUAGE_CODES.includes(base)) return base;
  }
  return DEFAULT_LANGUAGE;
}

i18n.use(initReactI18next).init({
  resources: {
    id: { translation: idTranslation },
    en: { translation: enTranslation },
  },
  lng: resolveInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

