import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetTelemetry, installTelemetry, trackEvent } from '@/lib/telemetry';
import { logger, setLogSink } from '@/lib/logger';

describe('telemetry', () => {
  beforeEach(() => {
    __resetTelemetry();
  });
  afterEach(() => {
    __resetTelemetry();
    vi.restoreAllMocks();
  });

  it('installTelemetry registra sink que respeita consent', () => {
    let consented = false;
    const inner = { capture: vi.fn() };
    installTelemetry({ isConsented: () => consented, sink: inner });

    // Sem consent, eventos não saem
    logger.warn('not-consented');
    expect(inner.capture).not.toHaveBeenCalled();

    consented = true;
    logger.warn('consented', { foo: 1 });
    expect(inner.capture).toHaveBeenCalledOnce();
    expect(inner.capture).toHaveBeenCalledWith('warn', 'consented', { foo: 1 });
  });

  it('installTelemetry é idempotente — segunda chamada é no-op', () => {
    const first = { capture: vi.fn() };
    const second = { capture: vi.fn() };
    installTelemetry({ isConsented: () => true, sink: first });
    installTelemetry({ isConsented: () => true, sink: second });
    logger.warn('only-first');
    expect(first.capture).toHaveBeenCalledOnce();
    expect(second.capture).not.toHaveBeenCalled();
  });

  it('fallback usa console quando nenhum sink customizado é passado', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    installTelemetry({ isConsented: () => true });
    logger.warn('to-console');
    logger.error('boom');
    expect(warnSpy).toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled();
  });

  it('trackEvent prefixa com [event] e usa logger.warn', () => {
    const sink = { capture: vi.fn() };
    installTelemetry({ isConsented: () => true, sink });
    trackEvent('button.click', { id: 'paywall_cta' });
    expect(sink.capture).toHaveBeenCalledWith('warn', '[event] button.click', { id: 'paywall_cta' });
  });

  it('setLogSink(null) silencia o pipeline', () => {
    const sink = { capture: vi.fn() };
    installTelemetry({ isConsented: () => true, sink });
    setLogSink(null);
    logger.warn('silent');
    expect(sink.capture).not.toHaveBeenCalled();
  });
});
