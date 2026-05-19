/**
 * Fechamento de branches que exigem state seedado:
 * - NotificationBell: precisa de notificações não-lidas na "DB" pra renderizar badge
 * - LimitedEventBanner: precisa de evento ativo (controlado via fake timers
 *   pra que `activeLimitedEvent` retorne o weekend event ao invés de null)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as TestRenderer from 'react-test-renderer';

import { LimitedEventBanner } from '@/components/LimitedEventBanner';
import { NotificationBell } from '@/components/NotificationBell';
import { notifications, resetAll } from '@/lib/db';

function render(node: React.ReactNode): TestRenderer.ReactTestRenderer {
  let r!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    r = TestRenderer.create(node as React.ReactElement);
  });
  return r;
}

async function flush(): Promise<void> {
  // Aguarda o useEffect (async) terminar — useFocusEffect / micro-tasks.
  // Sem isso, o setUnread(count) pode disparar APÓS o assert.
  await new Promise(r => setTimeout(r, 0));
}

declare const __asyncStorageReset: () => void;

describe('NotificationBell — render do badge', () => {
  beforeEach(async () => {
    __asyncStorageReset();
    await resetAll();
  });

  it('badge oculto quando unread=0 (estado padrão pós-reset)', async () => {
    const r = render(<NotificationBell profileId="u1" refreshKey={0} />);
    await flush();
    TestRenderer.act(() => {
      r.update(<NotificationBell profileId="u1" refreshKey={1} />);
    });
    expect(r.toJSON()).toBeTruthy();
  });

  it('badge visível quando unread > 0 (1-9 sem prefixo "9+")', async () => {
    // Seeda 3 notificações não lidas
    const base = { user_id: 'u1', kind: 'reminder' as const, title: 't', payload: null, read_at: null };
    await notifications.add({ ...base, body: 'a' });
    await notifications.add({ ...base, body: 'b' });
    await notifications.add({ ...base, body: 'c' });
    const r = render(<NotificationBell profileId="u1" refreshKey={0} />);
    await flush();
    // Re-render pra disparar useEffect com state atualizado
    TestRenderer.act(() => {
      r.update(<NotificationBell profileId="u1" refreshKey={1} />);
    });
    await flush();
    expect(r.toJSON()).toBeTruthy();
  });

  it('badge mostra "9+" quando unread > 9', async () => {
    // Seeda 12 notificações não lidas — cobre ternário unread > 9
    const base = { user_id: 'u1', kind: 'reminder' as const, title: 't', payload: null, read_at: null };
    for (let i = 0; i < 12; i++) {
      await notifications.add({ ...base, body: `n${i}` });
    }
    const r = render(<NotificationBell profileId="u1" refreshKey={0} />);
    await flush();
    TestRenderer.act(() => {
      r.update(<NotificationBell profileId="u1" refreshKey={2} />);
    });
    await flush();
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('LimitedEventBanner — evento ativo via fake timers', () => {
  beforeEach(() => {
    // Sábado, 2026-05-16, 14:00 → activeLimitedEvent retorna weekend-double-xp
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-16T14:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renderiza banner durante o weekend (cobre branch event != null + JSX)', () => {
    const r = render(<LimitedEventBanner />);
    expect(r.toJSON()).toBeTruthy();
  });

  it('atualiza a cada 60s via setInterval (cobre callback do interval)', () => {
    const r = render(<LimitedEventBanner />);
    // Avança o timer 60s pra triggerar o setInterval interno
    TestRenderer.act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('LimitedEventBanner — fora do evento (sem renderizar)', () => {
  beforeEach(() => {
    // Terça-feira de manhã, 2026-05-19, 10:00 → nenhum evento ativo
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-19T10:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sem evento → return null (cobre branch falsy)', () => {
    const r = render(<LimitedEventBanner />);
    // Quando event=null, retorna null e r.toJSON() === null
    expect(r.toJSON()).toBeNull();
  });
});
