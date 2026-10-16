import { describe, it, expect } from 'vitest';
import { calculateVerdict } from './verdict.js';
import { mapStats } from './mappers.js';
import { encrypt, decrypt } from '../crypto.js';

describe('Verdict calculation', () => {
  it('returns clean when malicious and suspicious are 0', () => {
    const stats = mapStats({ malicious: 0, suspicious: 0, harmless: 10, undetected: 60 });
    expect(calculateVerdict(stats, 3)).toBe('clean');
  });

  it('returns warning when malicious is 1 (< 3)', () => {
    const stats = mapStats({ malicious: 1, suspicious: 0, harmless: 10, undetected: 59 });
    expect(calculateVerdict(stats, 3)).toBe('warning');
  });

  it('returns warning when suspicious >= 1', () => {
    const stats = mapStats({ malicious: 0, suspicious: 2, harmless: 10, undetected: 58 });
    expect(calculateVerdict(stats, 3)).toBe('warning');
  });

  it('returns danger when malicious >= threshold T', () => {
    const stats = mapStats({ malicious: 3, suspicious: 0, harmless: 10, undetected: 57 });
    expect(calculateVerdict(stats, 3)).toBe('danger');
  });
});

describe('AES-256-GCM encryption', () => {
  it('encrypts and decrypts accurately', () => {
    const secretKey = 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef';
    const encrypted = encrypt(secretKey);
    expect(encrypted).not.toBe(secretKey);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(secretKey);
  });
});
