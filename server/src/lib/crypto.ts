import crypto from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // standard for GCM
const TAG_LENGTH = 16;

function getKeyBuffer(): Buffer {
  const keyBuf = Buffer.from(env.ENCRYPTION_KEY, 'base64');
  if (keyBuf.length === 32) {
    return keyBuf;
  }
  // If not exactly 32 bytes from base64, hash with sha256 to ensure 32 bytes
  return crypto.createHash('sha256').update(env.ENCRYPTION_KEY).digest();
}

/**
 * Encrypts plaintext string using AES-256-GCM
 * Returns base64 string formatted as: iv (12 bytes) + authTag (16 bytes) + ciphertext
 */
export function encrypt(text: string): string {
  const key = getKeyBuffer();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypts base64 string containing iv + tag + ciphertext using AES-256-GCM
 */
export function decrypt(encryptedBase64: string): string {
  const key = getKeyBuffer();
  const combined = Buffer.from(encryptedBase64, 'base64');

  if (combined.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid encrypted payload length');
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}
