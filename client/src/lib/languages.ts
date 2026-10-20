/**
 * Supported UI languages.
 *
 * English is the default and the ultimate fallback. Languages that do not yet
 * ship a translation file fall back to English key-by-key, so adding a new
 * entry here is enough to surface it in the Preferences picker.
 */

export interface LanguageOption {
  code: string;
  /** Endonym — the language name written in that language. */
  label: string;
  /** English name, useful for search / fallback display. */
  english: string;
  /** BCP-47 flag emoji, purely decorative. */
  flag: string;
}

// Only English and Indonesian ship translation files, so the picker only
// offers those two. Any other saved language code falls back to English
// (see i18n/index.ts, which validates against LANGUAGE_CODES).
export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', english: 'English', flag: '🇬🇧' },
  { code: 'id', label: 'Bahasa Indonesia', english: 'Indonesian', flag: '🇮🇩' },
];

export const DEFAULT_LANGUAGE = 'en';

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export function findLanguage(code: string | undefined | null): LanguageOption | undefined {
  if (!code) return undefined;
  const base = code.toLowerCase().split('-')[0];
  return LANGUAGES.find((l) => l.code === base);
}
