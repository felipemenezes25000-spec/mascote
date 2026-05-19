/**
 * Testes para o logger.
 *
 * O logger é a única porta de saída pra console + sinks externos. Crítico:
 * - Em produção (`__DEV__ = false`), não loga em console.
 * - Sinks só recebem warn/error (não dev).
 * - Não vaza dados sensíveis (verificamos que `context` é passado intacto, sem mutação).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger, setLogSink, type LogSink } from '@/lib/logger';

describe('logger', () => {
  beforeEach(() => {
    setLogSink(null);
    // dev mode default ON pra testes (NODE_ENV=test). __DEV__ undefined → falls back.
  });

  it('logger.warn escreve em console.warn em dev', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('algo', { reason: 'x' });
    expect(spy).toHaveBeenCalledWith('algo', { reason: 'x' });
    spy.mockRestore();
  });

  it('logger.error escreve em console.error em dev', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('boom', { code: 42 });
    expect(spy).toHaveBeenCalledWith('boom', { code: 42 });
    spy.mockRestore();
  });

  it('logger.dev escreve em console.log em dev', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.dev('hint', 1, 'two');
    expect(spy).toHaveBeenCalledWith('[dev]', 'hint', 1, 'two');
    spy.mockRestore();
  });

  it('sink customizado recebe warn', () => {
    const captured: Array<{ lvl: string; msg: string; ctx?: any }> = [];
    const sink: LogSink = { capture: (lvl, msg, ctx) => captured.push({ lvl, msg, ctx }) };
    setLogSink(sink);
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('alerta', { a: 1 });
    expect(captured).toEqual([{ lvl: 'warn', msg: 'alerta', ctx: { a: 1 } }]);
    spy.mockRestore();
  });

  it('sink customizado recebe error', () => {
    const captured: Array<{ lvl: string; msg: string }> = [];
    setLogSink({ capture: (lvl, msg) => captured.push({ lvl, msg }) });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('fatal');
    expect(captured).toEqual([{ lvl: 'error', msg: 'fatal' }]);
    spy.mockRestore();
  });

  it('sink NÃO recebe dev() (privacidade — só warn/error)', () => {
    const captured: any[] = [];
    setLogSink({ capture: (...args) => captured.push(args) });
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.dev('verboso');
    expect(captured).toEqual([]);
    spy.mockRestore();
  });

  it('setLogSink(null) desliga o sink', () => {
    let calls = 0;
    setLogSink({ capture: () => calls++ });
    const w = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('a');
    expect(calls).toBe(1);
    setLogSink(null);
    logger.warn('b');
    expect(calls).toBe(1);
    w.mockRestore();
  });

  it('NODE_ENV=production silencia console (mantém sink)', () => {
    const original = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'production';
    const captured: string[] = [];
    setLogSink({ capture: (_, msg) => captured.push(msg) });
    const cWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cErr = vi.spyOn(console, 'error').mockImplementation(() => {});
    const cLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.dev('x');
    logger.warn('y');
    logger.error('z');
    expect(cLog).not.toHaveBeenCalled();
    expect(cWarn).not.toHaveBeenCalled();
    expect(cErr).not.toHaveBeenCalled();
    expect(captured).toEqual(['y', 'z']);
    (process.env as any).NODE_ENV = original;
    cWarn.mockRestore();
    cErr.mockRestore();
    cLog.mockRestore();
  });
});
