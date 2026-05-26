/**
 * AutoSaveIndicator — texto pequeno "salvo há Xs" no header do Atelier.
 *
 * Atualiza a cada 10s via setInterval (não rerender por timestamp granular).
 * Mostra "..." quando lastSavedAt=null (nunca salvou) ou recém-mudou (pending).
 *
 * Tom secondary, mono, fontSize 10 — discreto, não compete com título.
 */

import { useEffect, useState } from 'react';
import { Typography } from '@/components/ui';

export interface AutoSaveIndicatorProps {
  /** ISO timestamp do último save bem-sucedido. Null = nunca salvou. */
  lastSavedAt: string | null;
}

function formatRelative(savedAt: string | null, now: number): string {
  if (!savedAt) return '...';
  const savedMs = new Date(savedAt).getTime();
  if (Number.isNaN(savedMs)) return '...';
  const diffSec = Math.max(0, Math.floor((now - savedMs) / 1000));
  if (diffSec < 5) return 'salvo agora';
  if (diffSec < 60) return `salvo há ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `salvo há ${diffMin}min`;
  const diffHr = Math.floor(diffMin / 60);
  return `salvo há ${diffHr}h`;
}

export function AutoSaveIndicator({ lastSavedAt }: AutoSaveIndicatorProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // 10s tick suficiente — granularidade do label é segundos→minutos.
    const id = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(id);
  }, []);

  const text = formatRelative(lastSavedAt, now);

  return (
    <Typography
      variant="mono"
      tone="dim"
      style={{ fontSize: 10, letterSpacing: 0.3 }}
      accessibilityLabel={`Status do auto-save: ${text}`}
    >
      {text}
    </Typography>
  );
}
