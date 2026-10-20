/**
 * Timezone helpers.
 *
 * We ship a curated list of the most common IANA timezones — every entry is a
 * valid IANA identifier, so `Intl.DateTimeFormat` / `formatDateTime` works
 * with all of them (this is what powers the timestamps shown in scan
 * results). The full ~430-zone IANA list was removed from the picker because
 * it was overwhelming; anything unusual still works if stored manually.
 */

export interface TimezoneGroup {
  region: string;
  zones: string[];
}

/** The curated, common-timezone list shown in the Preferences picker. */
export const COMMON_TIMEZONES: string[] = [
  'UTC',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'America/Anchorage',
  'America/Argentina/Buenos_Aires',
  'America/Bogota',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/New_York',
  'America/Phoenix',
  'America/Sao_Paulo',
  'America/Toronto',
  'Asia/Bangkok',
  'Asia/Dubai',
  'Asia/Hong_Kong',
  'Asia/Jakarta',
  'Asia/Jayapura',
  'Asia/Kolkata',
  'Asia/Makassar',
  'Asia/Manila',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Atlantic/Reykjavik',
  'Australia/Adelaide',
  'Australia/Perth',
  'Australia/Sydney',
  'Europe/Amsterdam',
  'Europe/Berlin',
  'Europe/Istanbul',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Moscow',
  'Europe/Paris',
  'Europe/Rome',
  'Pacific/Auckland',
  'Pacific/Fiji',
  'Pacific/Honolulu',
];

/** Returns the curated list of common IANA timezone identifiers. */
export function getAllTimezones(): string[] {
  return [...COMMON_TIMEZONES];
}

/** Groups timezones by their region prefix (text before the first "/"). */
export function groupTimezones(zones: string[]): TimezoneGroup[] {
  const groups = new Map<string, string[]>();
  for (const zone of zones) {
    const region = zone.includes('/') ? zone.split('/')[0] : 'Other';
    const bucket = groups.get(region);
    if (bucket) bucket.push(zone);
    else groups.set(region, [zone]);
  }
  return [...groups.entries()]
    .map(([region, regionZones]) => ({ region, zones: regionZones }))
    .sort((a, b) => a.region.localeCompare(b.region));
}

/**
 * Returns a short GMT offset label for a timezone, e.g. "GMT+7".
 * Falls back to an empty string when the timezone is unknown.
 */
export function tzOffsetLabel(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const part = formatter
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName');
    return part?.value ?? '';
  } catch {
    return '';
  }
}
