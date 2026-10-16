import { describe, it, expect } from 'vitest';
import { formatBytes, truncate, formatDateTime } from './format.js';
import i18n from '../i18n/index.js';

describe('Client format utils', () => {
  it('formats bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024 * 5)).toBe('5 MB');
  });

  it('truncates strings with ellipsis', () => {
    expect(truncate('short text', 20)).toBe('short text');
    expect(truncate('this is a very long string that should be cut', 15)).toBe('this is a ve...');
  });

  it('formats timestamps with 24h time by default', () => {
    const out = formatDateTime('2024-12-31T14:30:00Z', 'UTC', '24h');
    expect(out).toContain('14:30');
    expect(out).not.toMatch(/AM|PM/i);
  });

  it('formats timestamps with 12h AM/PM when requested', () => {
    const out = formatDateTime('2024-12-31T14:30:00Z', 'UTC', '12h');
    expect(out).toMatch(/0?2:30:00\s?PM/i);
  });

  it('derives the date layout from the active locale', () => {
    const prev = i18n.language;

    i18n.language = 'en';
    expect(formatDateTime('2024-12-31T14:30:00Z', 'UTC', '24h')).toContain('12/31/2024');

    i18n.language = 'id';
    expect(formatDateTime('2024-12-31T14:30:00Z', 'UTC', '24h')).toContain('31/12/2024');

    i18n.language = prev;
  });

  it('returns an em dash for missing or invalid input', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime(undefined)).toBe('—');
    expect(formatDateTime('not-a-date')).toBe('—');
  });
});
