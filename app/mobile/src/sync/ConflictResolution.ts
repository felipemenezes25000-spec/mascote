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

  const localTs = Date.parse(local.updatedAt ?? '') || 0;
  const remoteTs = Date.parse(remote.updatedAt ?? '') || 0;
  return localTs >= remoteTs ? local : remote;
}
