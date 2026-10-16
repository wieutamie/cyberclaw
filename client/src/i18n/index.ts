import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import idTranslation from './locales/id.json';
import enTranslation from './locales/en.json';

// English is the default and fallback language. A user's explicit choice
// (persisted in localStorage) still wins so the Preferences language switch
// keeps working.
const savedLang = localStorage.getItem('cyberclaw_language') || 'en';

i18n.use(initReactI18next).init({
  resources: {
    id: { translation: idTranslation },
    en: { translation: enTranslation },
  },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
