import { Request, Response, NextFunction } from 'express';
import { signAnonToken, verifyAnonToken, newAnonId } from '../lib/anonSession.js';
import { AnonUserService } from '../services/anonUser.service.js';
import { AuthUser } from '../types/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Response header the client reads to persist its anonymous session token. */
export const ANON_SESSION_HEADER = 'X-Anon-Session';

/**
 * Anonymous session middleware — replaces the old `requireAuth`.
 *
 * Every request is served without a login:
 *   1. If a valid, server-signed anonymous token is presented (via the
 *      `Authorization: Bearer <token>` header) its id is reused.
 *   2. Otherwise a brand-new anonymous id is minted and the signed token is
 *      returned in the `X-Anon-Session` response header for the client to store.
 *
 * `req.user.id` is always populated, so all downstream services keep working
 * exactly as they did when the id came from a real session.
 */
export async function anonSession(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let id: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    id = verifyAnonToken(authHeader.slice('Bearer '.length).trim());
  }

  if (!id) {
    id = newAnonId();
    res.setHeader(ANON_SESSION_HEADER, signAnonToken(id));
  }

  req.user = { id };

  // Make sure the FK parent row exists before controllers insert child rows.
  await AnonUserService.ensure(id);

  return next();
}
