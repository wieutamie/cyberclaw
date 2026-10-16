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

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', english: 'English', flag: '🇬🇧' },
  { code: 'id', label: 'Bahasa Indonesia', english: 'Indonesian', flag: '🇮🇩' },
  { code: 'ms', label: 'Bahasa Melayu', english: 'Malay', flag: '🇲🇾' },
  { code: 'es', label: 'Español', english: 'Spanish', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', english: 'Portuguese', flag: '🇵🇹' },
  { code: 'fr', label: 'Français', english: 'French', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', english: 'German', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', english: 'Italian', flag: '🇮🇹' },
  { code: 'nl', label: 'Nederlands', english: 'Dutch', flag: '🇳🇱' },
  { code: 'ru', label: 'Русский', english: 'Russian', flag: '🇷🇺' },
  { code: 'tr', label: 'Türkçe', english: 'Turkish', flag: '🇹🇷' },
  { code: 'ar', label: 'العربية', english: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', label: 'हिन्दी', english: 'Hindi', flag: '🇮🇳' },
  { code: 'th', label: 'ไทย', english: 'Thai', flag: '🇹🇭' },
  { code: 'vi', label: 'Tiếng Việt', english: 'Vietnamese', flag: '🇻🇳' },
  { code: 'zh', label: '中文', english: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', english: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', english: 'Korean', flag: '🇰🇷' },
];

export const DEFAULT_LANGUAGE = 'en';

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export function findLanguage(code: string | undefined | null): LanguageOption | undefined {
  if (!code) return undefined;
  const base = code.toLowerCase().split('-')[0];
  return LANGUAGES.find((l) => l.code === base);
}
