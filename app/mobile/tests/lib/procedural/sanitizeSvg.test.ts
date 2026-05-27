import { describe, it, expect } from 'vitest';
import { sanitizeSvg, SvgSanitizationError } from '@/lib/procedural/sanitizeSvg';

describe('sanitizeSvg — happy path', () => {
  it('aceita SVG simples com circle', () => {
    const out = sanitizeSvg('<svg><circle cx="10" cy="10" r="5" fill="red" /></svg>');
    expect(out).toContain('<circle');
  });

  it('aceita path com d, fill, stroke', () => {
    const out = sanitizeSvg('<svg><path d="M0 0 L10 10" fill="#fff" stroke="#000" stroke-width="2" /></svg>');
    expect(out).toContain('<path');
  });

  it('aceita grupos aninhados até MAX_DEPTH', () => {
    const out = sanitizeSvg('<svg><g><g><circle cx="1" cy="1" r="1" fill="red" /></g></g></svg>');
    expect(out).toContain('<g>');
  });
});

describe('sanitizeSvg — bloqueia ataques', () => {
  it.each([
    ['<svg><script>alert(1)</script></svg>', /script/i],
    ['<svg><foreignObject /></svg>', /foreignObject/i],
    ['<svg><iframe src="evil" /></svg>', /iframe/i],
    ['<svg><circle onclick="x" cx="1" cy="1" r="1" /></svg>', /onclick|atributo|padr[ãa]o/i],
    ['<svg><image href="javascript:alert(1)" /></svg>', /image/i],
    ['<svg><use xlink:href="evil" /></svg>', /xlink|use/i],
    ['<svg><!DOCTYPE evil><circle /></svg>', /doctype/i],
    ['<svg><circle cx="1" cy="1" r="1" fill="javascript:alert(1)" /></svg>', /javascript|suspeito/i],
    ['<!--<svg><script>x</script>-->', /script/i],
  ])('rejeita %s', (input, pattern) => {
    expect(() => sanitizeSvg(input)).toThrow(SvgSanitizationError);
    try {
      sanitizeSvg(input);
    } catch (err) {
      expect((err as Error).message).toMatch(pattern);
    }
  });

  it('rejeita SVG > 2KB', () => {
    const huge = '<svg>' + '<circle cx="1" cy="1" r="1" />'.repeat(200) + '</svg>';
    expect(() => sanitizeSvg(huge)).toThrow(/bytes/);
  });

  it('rejeita > 20 nodes', () => {
    const many = '<svg>' + '<circle cx="1" cy="1" r="1" />'.repeat(25) + '</svg>';
    expect(() => sanitizeSvg(many)).toThrow(/nodes/);
  });

  it('rejeita string vazia', () => {
    expect(() => sanitizeSvg('   ')).toThrow(/vazia/);
  });

  it('rejeita não-string', () => {
    expect(() => sanitizeSvg(null as unknown as string)).toThrow(/string/);
  });

  it('rejeita tag fora do whitelist', () => {
    expect(() => sanitizeSvg('<svg><foo /></svg>')).toThrow(/foo/);
  });

  it('rejeita atributo fora do whitelist', () => {
    expect(() => sanitizeSvg('<svg><circle cx="1" cy="1" r="1" data-evil="x" /></svg>')).toThrow(/data-evil/);
  });
});
