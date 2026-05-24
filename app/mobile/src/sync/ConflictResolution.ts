/**
 * Resolução de conflitos sync — last-write-wins com timestamps.
 */

export interface Timestamped {
  updatedAt?: string;
}

export type ConflictStrategy = 'local_wins' | 'remote_wins' | 'newest_wins';

export function resolveConflict<T extends Timestamped>(
  local: T,
  remote: T,
  strategy: ConflictStrategy = 'newest_wins',
): T {
  if (strategy === 'local_wins') return local;
  if (strategy === 'remote_wins') return remote;

  // Date.parse('') is NaN — using `|| 0` lumped both "missing" and "epoch"
  // together and broke newest-wins symmetry: when only one side had a
  // timestamp, the side WITHOUT one was treated as 1970 (always older),
  // and when both were missing local always won via `>=`. Now we keep
  // the parsed values nullable and prefer the side that actually has
  // one; when neither does, default to local (caller can pick strategy
  // explicitly for that case).
  const localTs = parseTs(local.updatedAt);
  const remoteTs = parseTs(remote.updatedAt);
  if (localTs === null && remoteTs === null) return local;
  if (localTs === null) return remote;
  if (remoteTs === null) return local;
  return localTs >= remoteTs ? local : remote;
}

function parseTs(value: string | undefined): number | null {
  if (!value) return null;
  const n = Date.parse(value);
  return Number.isFinite(n) ? n : null;
}
