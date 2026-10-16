/**
 * Timezone helpers.
 *
 * The full IANA timezone list is derived at runtime from
 * `Intl.supportedValuesOf('timeZone')` so it is always complete and never goes
 * stale. A curated fallback is provided for older engines that lack
 * `supportedValuesOf`.
 */

export interface TimezoneGroup {
  region: string;
  zones: string[];
}

const FALLBACK_ZONES: string[] = [
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

/** Returns the full, sorted list of IANA timezone identifiers. */
export function getAllTimezones(): string[] {
  try {
    const supportedValuesOf = (Intl as unknown as {
      supportedValuesOf?: (key: string) => string[];
    }).supportedValuesOf;
    if (typeof supportedValuesOf === 'function') {
      const zones = supportedValuesOf('timeZone');
      if (Array.isArray(zones) && zones.length > 0) {
        const set = new Set(zones);
        // `supportedValuesOf` omits UTC on some engines — make sure it is present.
        if (!set.has('UTC')) set.add('UTC');
        return [...set].sort((a, b) => a.localeCompare(b));
      }
    }
  } catch {
    /* fall through to the curated list */
  }
  return [...FALLBACK_ZONES];
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
