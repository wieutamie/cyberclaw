import { describe, it, expect } from 'vitest';
import { formatBytes, truncate } from './format.js';

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
});
