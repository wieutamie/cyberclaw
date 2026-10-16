import i18n from '../i18n/index.js';

/**
 * Formats a timestamp for display.
 *
 * The date layout is derived automatically from the active UI locale (e.g.
 * `id` → `31/12/2024`, `en` → `12/31/2024`) so the user no longer has to pick a
 * date format by hand — it simply follows the calendar/locale they are using.
 * Only the time style (12-hour vs 24-hour) remains user-configurable.
 */
export function formatDateTime(
  dateInput: string | number | Date | null | undefined,
  timezone: string = 'Asia/Jakarta',
  timeFormat: '12h' | '24h' = '24h'
): string {
  if (!dateInput) return '—';

  let date: Date;
  if (typeof dateInput === 'number') {
    // If epoch in seconds (VT often returns seconds)
    date = dateInput < 1e11 ? new Date(dateInput * 1000) : new Date(dateInput);
  } else {
    date = new Date(dateInput);
  }

  if (isNaN(date.getTime())) return '—';

  const locale = (i18n.language || 'en').split('-')[0];

  const build = (tz: string) =>
    new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: timeFormat === '12h',
    }).format(date);

  try {
    return build(timezone);
  } catch {
    // Fallback to UTC if timezone invalid
    try {
      return build('UTC');
    } catch {
      return date.toISOString();
    }
  }
}

export function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '—';
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function truncate(text: string, maxLen: number = 40): string {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 3)}...`;
}
