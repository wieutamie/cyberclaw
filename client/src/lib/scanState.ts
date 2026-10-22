import { ScanState } from '../types/index.js';

/**
 * States after which a scan will never change again.
 *
 * This list MUST match the early-return branches in the server's
 * `getScanStatus`. If a state is terminal on the server but missing here, the
 * client keeps polling a scan that is already finished — the spinner runs
 * forever and the user never sees the result.
 *
 * `timeout` and `cancelled` were added with the server-side reaper: a scan that
 * is abandoned mid-flight is now finalised as `timeout` instead of hanging in
 * `in_progress` indefinitely.
 */
const FINAL_STATES: readonly ScanState[] = [
  'completed',
  'not_found',
  'failed',
  'timeout',
  'cancelled',
];

export function isFinalState(state?: string | null): boolean {
  return !!state && (FINAL_STATES as readonly string[]).includes(state);
}

/** States that represent an error rather than a usable result. */
export function isErrorState(state?: string | null): boolean {
  return state === 'failed' || state === 'timeout' || state === 'cancelled';
}
