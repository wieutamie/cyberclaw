import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

/**
 * Server-signed anonymous session tokens.
 *
 * Cyber Claw no longer has user accounts. Instead, every visitor gets an
 * anonymous identity that is minted and signed BY THE SERVER. The client only
 * ever echoes the opaque token back, so an anonymous id can never be spoofed or
 * chosen client-side. The id is used purely as a partition key so each browser
 * gets its own scan history / analytics / settings.
 */

const ANON_TTL = '365d';

export interface AnonTokenPayload {
  sub: string;
  type: 'anon';
}

/** Mints a fresh, random anonymous user id (UUID v4). */
export function newAnonId(): string {
  return crypto.randomUUID();
}

/** Signs an anonymous session token for the given id. */
export function signAnonToken(id: string): string {
  const payload: AnonTokenPayload = { sub: id, type: 'anon' };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: ANON_TTL as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

/** Verifies an anonymous token and returns its id, or null when invalid. */
export function verifyAnonToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
    }) as AnonTokenPayload;
    if (decoded.type === 'anon' && typeof decoded.sub === 'string' && decoded.sub) {
      return decoded.sub;
    }
  } catch {
    // Invalid / expired / tampered token — caller will mint a new identity.
  }
  return null;
}
