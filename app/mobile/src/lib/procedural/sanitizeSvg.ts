/**
 * Sanitizador de SVG vindo do LLM — defesa-em-profundidade.
 *
 * Validador whitelist: só tags/atributos seguros. Recusa tudo o que possa
 * executar código (`<script>`, `<foreignObject>`, `on*`, `href` com javascript:),
 * tamanhos abusivos, ou profundidade de aninhamento maior que MAX_DEPTH.
 *
 * Não usa DOMParser (rodaria em runtime nativo via JSDOM-ish, e queremos
 * algo determinístico). Faz parser-lite com regex + scan estrutural.
 */

const MAX_BYTES = 2 * 1024;
const MAX_NODES = 20;
const MAX_DEPTH = 5;

const ALLOWED_TAGS = new Set([
  'svg', 'g', 'path', 'circle', 'rect', 'ellipse', 'line', 'polygon', 'polyline',
]);

const ALLOWED_ATTRS = new Set([
  // geometria
  'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height',
  'x1', 'y1', 'x2', 'y2', 'points',
  // estilo
  'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'opacity', 'fill-opacity', 'stroke-opacity',
  'transform',
  // estrutura segura
  'viewBox',
]);

const BANNED_PATTERNS: RegExp[] = [
  /<script/i,
  /<foreignObject/i,
  /<iframe/i,
  /<embed/i,
  /<object/i,
  /<style/i,
  /<use/i,
  /<image/i,
  /xlink:/i,
  /[\s/>"'`]on[a-z]+\s*=/i,    // onclick, onload, etc — separador pode ser espaço, `/`, aspas
  /javascript:/i,
  /data:[^,]*script/i,
  /xmlns:[^=]+=/i,             // xmlns custom (xmlns:xlink etc)
  /entity\s+/i,                // ENTITY declarations
  /<!doctype/i,
  /<!\[cdata/i,
];

export class SvgSanitizationError extends Error {
  constructor(public readonly path: string, msg: string) {
    super(`SVG inválido (${path}): ${msg}`);
  }
}

export function sanitizeSvg(input: string, path = 'svg'): string {
  if (typeof input !== 'string') {
    throw new SvgSanitizationError(path, 'precisa ser string');
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new SvgSanitizationError(path, 'string vazia');
  }
  const bytes = new TextEncoder().encode(trimmed).length;
  if (bytes > MAX_BYTES) {
    throw new SvgSanitizationError(path, `> ${MAX_BYTES} bytes (recebido: ${bytes})`);
  }

  for (const pat of BANNED_PATTERNS) {
    if (pat.test(trimmed)) {
      throw new SvgSanitizationError(path, `padrão proibido: ${pat}`);
    }
  }

  // Scan estrutural simples: tokens de abertura <tag e fechamento </tag.
  // Não é parser completo de XML — é validador que rejeita qualquer suspeita.
  // Atributos delimitados por `[^<>]*` pra impedir match cross-tag que ignoraria
  // tags maliciosas no meio (bug encontrado em teste: `<svg><foo />` casava só svg).
  // O nome da tag inclui `:_-` (namespaces/hifens) de propósito: assim
  // `<a:script>`, `<my-el>` ou `<xlink:foo>` são CAPTURADOS e rejeitados
  // explicitamente pelo whitelist abaixo, em vez de o regex parar no `:`/`-` e
  // a tag escapar silenciosamente do scan estrutural (defesa-em-profundidade).
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9:_-]*)(\s+[^<>]*)?\s*\/?>/g;
  let nodeCount = 0;
  let depth = 0;
  let maxDepth = 0;
  let m: RegExpExecArray | null;
  while ((m = tagPattern.exec(trimmed)) !== null) {
    const tag = m[1].toLowerCase();
    const isClose = m[0].startsWith('</');
    const selfClose = m[0].endsWith('/>');

    if (!ALLOWED_TAGS.has(tag)) {
      throw new SvgSanitizationError(path, `tag não permitida: ${tag}`);
    }

    if (!isClose) {
      nodeCount += 1;
      if (nodeCount > MAX_NODES) {
        throw new SvgSanitizationError(path, `> ${MAX_NODES} nodes`);
      }
      // Valida atributos da tag aberta.
      // Captura TODO atributo — com valor entre aspas, sem aspas, ou sem valor —
      // pra que NENHUM nome de atributo escape do whitelist. Bug anterior: o
      // regex só casava valores entre aspas, então `onload=alert(1)` (sem aspas)
      // ou `r="1"/onload=...` (separado por `/` em vez de espaço) passava sem
      // checagem e rodava no target web via SvgXml. Travado por
      // tests/lib/procedural/sanitizeSvg.test.ts ('atributos sem aspas / on*').
      const attrChunk = m[2] ?? '';
      const attrPattern =
        /([a-zA-Z][a-zA-Z0-9:_-]*)(\s*=\s*("[^"]*"|'[^']*'|[^\s"'<>`]+))?/g;
      let am: RegExpExecArray | null;
      while ((am = attrPattern.exec(attrChunk)) !== null) {
        const attr = am[1].toLowerCase();
        if (!ALLOWED_ATTRS.has(attr)) {
          throw new SvgSanitizationError(path, `atributo não permitido: ${attr}`);
        }
        const raw = am[3];
        if (raw) {
          const value =
            raw.startsWith('"') || raw.startsWith("'") ? raw.slice(1, -1) : raw;
          // Bloqueia valores suspeitos
          if (/javascript:|data:[^,]*script|<|>/i.test(value)) {
            throw new SvgSanitizationError(path, `valor de atributo suspeito em ${attr}`);
          }
        }
      }
      if (!selfClose) {
        depth += 1;
        if (depth > maxDepth) maxDepth = depth;
        if (depth > MAX_DEPTH) {
          throw new SvgSanitizationError(path, `profundidade > ${MAX_DEPTH}`);
        }
      }
    } else {
      depth = Math.max(0, depth - 1);
    }
  }

  if (nodeCount === 0) {
    throw new SvgSanitizationError(path, 'sem nodes válidos');
  }

  return trimmed;
}
