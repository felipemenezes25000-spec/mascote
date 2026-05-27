import { describe, expect, it } from 'vitest';
import { displayNameOrYou, sanitizeDisplayName } from '@/lib/identity/displayName';

describe('sanitizeDisplayName', () => {
  it('aceita nomes simples', () => {
    expect(sanitizeDisplayName('Felipe')).toBe('Felipe');
    expect(sanitizeDisplayName('Ana')).toBe('Ana');
  });

  it('aceita acentos e cedilhas', () => {
    expect(sanitizeDisplayName('José')).toBe('José');
    expect(sanitizeDisplayName('Conceição')).toBe('Conceição');
    expect(sanitizeDisplayName('São Paulo')).toBe('São Paulo');
  });

  it('aceita hífen e apóstrofo em nomes compostos', () => {
    expect(sanitizeDisplayName("D'Angelo")).toBe("D'Angelo");
    expect(sanitizeDisplayName('Anne-Marie')).toBe('Anne-Marie');
  });

  it('trim de whitespace', () => {
    expect(sanitizeDisplayName('  Felipe  ')).toBe('Felipe');
    expect(sanitizeDisplayName('\tAna\n')).toBe('Ana');
  });

  it('rejeita junk com vírgula (caso original "hm,mjh")', () => {
    expect(sanitizeDisplayName('hm,mjh')).toBeNull();
    expect(sanitizeDisplayName('a,b')).toBeNull();
  });

  it('rejeita strings começando com não-letra', () => {
    expect(sanitizeDisplayName('123abc')).toBeNull();
    expect(sanitizeDisplayName('-Felipe')).toBeNull();
    expect(sanitizeDisplayName(' 9')).toBeNull();
  });

  it('rejeita string menor que 2 chars', () => {
    expect(sanitizeDisplayName('a')).toBeNull();
    expect(sanitizeDisplayName('')).toBeNull();
  });

  it('rejeita null/undefined', () => {
    expect(sanitizeDisplayName(null)).toBeNull();
    expect(sanitizeDisplayName(undefined)).toBeNull();
  });

  it('rejeita números/símbolos no meio', () => {
    expect(sanitizeDisplayName('Fel1pe')).toBeNull();
    expect(sanitizeDisplayName('Ana@123')).toBeNull();
    expect(sanitizeDisplayName('Maria!')).toBeNull();
  });

  it('limita a 24 chars', () => {
    const long = 'A'.repeat(50);
    const result = sanitizeDisplayName(long);
    expect(result?.length).toBeLessThanOrEqual(24);
  });
});

describe('displayNameOrYou', () => {
  it('retorna nome sanitizado quando válido', () => {
    expect(displayNameOrYou('Felipe')).toBe('Felipe');
  });

  it('retorna "você" para nome inválido', () => {
    expect(displayNameOrYou('hm,mjh')).toBe('você');
    expect(displayNameOrYou('123')).toBe('você');
    expect(displayNameOrYou(null)).toBe('você');
    expect(displayNameOrYou(undefined)).toBe('você');
    expect(displayNameOrYou('')).toBe('você');
  });
});
