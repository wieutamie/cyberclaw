import { describe, it, expect } from 'vitest';
import {
  totalEngines,
  respondedEngines,
  flaggedEngines,
  detectionPercent,
} from './stats.js';

describe('totalEngines', () => {
  it('sums ALL seven categories, not just the big four', () => {
    // Real-world shape: VT reported 71 engines for this file.
    const total = totalEngines({
      malicious: 47,
      suspicious: 0,
      harmless: 0,
      undetected: 19,
      timeout: 0,
      failure: 0,
      unsupported: 5,
    });
    expect(total).toBe(71);
  });

  it('includes timeout and failure buckets', () => {
    const total = totalEngines({
      malicious: 1,
      suspicious: 1,
      harmless: 1,
      undetected: 60,
      timeout: 4,
      failure: 3,
      unsupported: 1,
    });
    expect(total).toBe(71);
  });

  it('equals the number of vendors actually reported', () => {
    // A scan where VT only reported 60 engines must total 60, not a padded 71.
    expect(
      totalEngines({
        malicious: 2,
        suspicious: 0,
        harmless: 5,
        undetected: 50,
        timeout: 2,
        failure: 1,
        unsupported: 0,
      })
    ).toBe(60);
  });

  it('returns 0 for missing stats', () => {
    expect(totalEngines(undefined)).toBe(0);
    expect(totalEngines(null)).toBe(0);
  });

  it('tolerates partial stats objects', () => {
    expect(totalEngines({ malicious: 5 } as any)).toBe(5);
  });
});

describe('respondedEngines', () => {
  it('excludes timeout, failure and unsupported', () => {
    expect(
      respondedEngines({
        malicious: 3,
        suspicious: 0,
        harmless: 10,
        undetected: 27,
        timeout: 20,
        failure: 7,
        unsupported: 3,
      })
    ).toBe(40);
  });

  it('counts undetected as a real answer', () => {
    expect(respondedEngines({ undetected: 12 } as any)).toBe(12);
  });

  it('is 0 when nothing answered', () => {
    expect(respondedEngines({ timeout: 5, failure: 2 } as any)).toBe(0);
    expect(respondedEngines(undefined)).toBe(0);
  });
});

describe('flaggedEngines', () => {
  it('sums malicious and suspicious only', () => {
    expect(
      flaggedEngines({
        malicious: 2,
        suspicious: 3,
        harmless: 50,
        undetected: 10,
      } as any)
    ).toBe(5);
  });
});

describe('detectionPercent', () => {
  it('divides flagged by engines that responded, not by the total scanned', () => {
    // 3 flags out of 70 scanned, but 30 engines timed out → 3/40 = 7.5%.
    const stats = {
      malicious: 3,
      suspicious: 0,
      harmless: 20,
      undetected: 17,
      timeout: 20,
      failure: 7,
      unsupported: 3,
    };
    expect(totalEngines(stats)).toBe(70);
    expect(respondedEngines(stats)).toBe(40);
    expect(detectionPercent(stats)).toBeCloseTo(7.5, 5);
  });

  it('is 0 when no engine responded instead of dividing by zero', () => {
    expect(detectionPercent({ timeout: 9 } as any)).toBe(0);
    expect(detectionPercent(null)).toBe(0);
  });

  it('is 0 for a fully clean scan and 100 when every engine flags', () => {
    expect(
      detectionPercent({ malicious: 0, suspicious: 0, harmless: 5, undetected: 5 } as any)
    ).toBe(0);
    expect(detectionPercent({ malicious: 10 } as any)).toBe(100);
  });

  it('counts suspicious towards the detection rate', () => {
    expect(detectionPercent({ malicious: 0, suspicious: 1, harmless: 3 } as any)).toBe(25);
  });
});
