import { formatInTimeZone } from 'date-fns-tz';

export function formatDateTime(
  dateInput: string | number | Date | null | undefined,
  timezone: string = 'Asia/Jakarta',
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' = 'DD/MM/YYYY',
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

  let df = 'dd/MM/yyyy';
  if (dateFormat === 'MM/DD/YYYY') df = 'MM/dd/yyyy';
  if (dateFormat === 'YYYY-MM-DD') df = 'yyyy-MM-dd';

  const tf = timeFormat === '12h' ? 'hh:mm:ss a' : 'HH:mm:ss';
  const pattern = `${df} ${tf}`;

  try {
    return formatInTimeZone(date, timezone, pattern);
  } catch {
    // Fallback to UTC if timezone invalid
    return formatInTimeZone(date, 'UTC', pattern);
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
