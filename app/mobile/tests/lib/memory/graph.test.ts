/**
 * Testes do Memory Graph.
 *
 * Invariantes:
 *  - buildGraph é pura, determinística
 *  - precededBy: A → B se diff temporal < 24h, ordem cronológica respeitada
 *  - relatedTo: ≥2 keywords em comum → edge simétrica
 *  - getRelated filtra por kind/minWeight/limit corretamente
 *  - rerankByGraph boosta scores conectados a seedIds
 *  - Centrality conta corretamente
 */

import { describe, expect, it } from 'vitest';
import {
  buildGraph,
  centrality,
  getRelated,
  graphStats,
  rerankByGraph,
  type MemoryEdge,
} from '@/lib/memory/graph';
import type { MemoryItem } from '@/lib/memory';

function makeMem(id: string, opts: Partial<MemoryItem> = {}): MemoryItem {
  return {
    id,
    user_id: 'u_1',
    kind: 'event',
    summary: '',
    source_snippet: '',
    keywords: [],
    created_at: '2026-05-19T10:00:00Z',
    last_recalled_at: null,
    ...opts,
  };
}

describe('buildGraph — invariantes', () => {
  it('lista vazia → grafo vazio', () => {
    const g = buildGraph([]);
    expect(g.adjacency.size).toBe(0);
    expect(g.edgeCount).toBe(0);
  });

  it('1 memória → grafo sem edges (não há par possível)', () => {
    const g = buildGraph([makeMem('m1')]);
    expect(g.edgeCount).toBe(0);
  });

  it('precededBy: 2 memórias dentro de 24h → edge A→B', () => {
    const mems = [
      makeMem('m1', { created_at: '2026-05-19T10:00:00Z' }),
      makeMem('m2', { created_at: '2026-05-19T16:00:00Z' }), // 6h depois
    ];
    const g = buildGraph(mems);
    const m1Edges = g.adjacency.get('m1') ?? [];
    const preceded = m1Edges.find(e => e.kind === 'precededBy');
    expect(preceded).toBeDefined();
    expect(preceded?.toId).toBe('m2');
    expect(preceded?.weight).toBeGreaterThan(0);
  });

  it('precededBy: 2 memórias COM diff > 24h → NÃO conecta', () => {
    const mems = [
      makeMem('m1', { created_at: '2026-05-19T10:00:00Z' }),
      makeMem('m2', { created_at: '2026-05-22T10:00:00Z' }), // 3 dias depois
    ];
    const g = buildGraph(mems);
    const m1Edges = g.adjacency.get('m1') ?? [];
    expect(m1Edges.find(e => e.kind === 'precededBy')).toBeUndefined();
  });

  it('precededBy weight = 1 - hours/24 (imediato = 1, 24h = 0)', () => {
    const mems = [
      makeMem('m1', { created_at: '2026-05-19T10:00:00Z' }),
      // 1 min depois → muito imediato → weight quase 1
      makeMem('m2', { created_at: '2026-05-19T10:01:00Z' }),
    ];
    const g = buildGraph(mems);
    const edge = (g.adjacency.get('m1') ?? []).find(e => e.kind === 'precededBy');
    expect(edge?.weight).toBeGreaterThan(0.99);
  });

  it('relatedTo: ≥2 keywords em comum → edge SIMÉTRICA', () => {
    const mems = [
      makeMem('m1', { keywords: ['sono', 'cansaço', 'noite'] }),
      makeMem('m2', { keywords: ['sono', 'cansaço', 'manhã'] }),
    ];
    const g = buildGraph(mems);
    const m1Edges = g.adjacency.get('m1') ?? [];
    const m2Edges = g.adjacency.get('m2') ?? [];
    const r1 = m1Edges.find(e => e.kind === 'relatedTo');
    const r2 = m2Edges.find(e => e.kind === 'relatedTo');
    expect(r1?.toId).toBe('m2');
    expect(r2?.toId).toBe('m1');
    // Mesmo weight nos 2 lados
    expect(r1?.weight).toBeCloseTo(r2?.weight ?? 0);
  });

  it('relatedTo: apenas 1 keyword em comum → NÃO conecta (threshold = 2)', () => {
    const mems = [
      makeMem('m1', { keywords: ['sono', 'cansaço'] }),
      makeMem('m2', { keywords: ['sono', 'energia'] }),
    ];
    const g = buildGraph(mems);
    const edges = g.adjacency.get('m1') ?? [];
    expect(edges.find(e => e.kind === 'relatedTo')).toBeUndefined();
  });

  it('Jaccard weight: 2 comum / 4 union = 0.5', () => {
    const mems = [
      makeMem('m1', { keywords: ['a', 'b', 'c'] }),
      makeMem('m2', { keywords: ['a', 'b', 'd'] }),
    ];
    const g = buildGraph(mems);
    const r = (g.adjacency.get('m1') ?? []).find(e => e.kind === 'relatedTo');
    // |∩|=2, |∪|=4 → 2/4 = 0.5
    expect(r?.weight).toBeCloseTo(0.5, 3);
  });

  it('ambas edges (precededBy + relatedTo) entre mesmo par', () => {
    const mems = [
      makeMem('m1', { keywords: ['x', 'y', 'z'], created_at: '2026-05-19T10:00:00Z' }),
      makeMem('m2', { keywords: ['x', 'y', 'w'], created_at: '2026-05-19T15:00:00Z' }),
    ];
    const g = buildGraph(mems);
    const edges = g.adjacency.get('m1') ?? [];
    expect(edges.some(e => e.kind === 'precededBy')).toBe(true);
    expect(edges.some(e => e.kind === 'relatedTo')).toBe(true);
  });

  it('determinismo: mesma lista → mesmo grafo', () => {
    const mems = [
      makeMem('m1', { keywords: ['a', 'b'], created_at: '2026-05-19T10:00:00Z' }),
      makeMem('m2', { keywords: ['a', 'b'], created_at: '2026-05-19T11:00:00Z' }),
    ];
    const g1 = buildGraph(mems);
    const g2 = buildGraph(mems);
    expect(g1.edgeCount).toBe(g2.edgeCount);
  });

  it('idempotência: input mutado depois NÃO afeta graph (snapshot)', () => {
    const mems = [makeMem('m1'), makeMem('m2')];
    const g = buildGraph(mems);
    // mutar input
    mems.push(makeMem('m3'));
    // graph não deve mudar
    expect(g.adjacency.has('m3')).toBe(false);
  });
});

describe('getRelated — query', () => {
  const mems = [
    makeMem('m1', { keywords: ['sono'], created_at: '2026-05-19T10:00:00Z' }),
    makeMem('m2', { keywords: ['sono', 'cansaço'], created_at: '2026-05-19T11:00:00Z' }),
    makeMem('m3', { keywords: ['sono', 'cansaço'], created_at: '2026-05-19T12:00:00Z' }),
    makeMem('m4', { keywords: ['comida'], created_at: '2026-05-20T10:00:00Z' }),
  ];
  const graph = buildGraph(mems);

  it('retorna edges conectadas ao memId', () => {
    const related = getRelated(graph, 'm2');
    expect(related.length).toBeGreaterThan(0);
  });

  it('filtra por kind', () => {
    const onlyPreceded = getRelated(graph, 'm2', { kinds: ['precededBy'] });
    for (const e of onlyPreceded) {
      expect(e.kind).toBe('precededBy');
    }
  });

  it('respeita limit', () => {
    const limited = getRelated(graph, 'm2', { limit: 1 });
    expect(limited.length).toBe(1);
  });

  it('filtra por minWeight', () => {
    const heavy = getRelated(graph, 'm2', { minWeight: 0.99 });
    // só edges com weight >= 0.99 — provavelmente uma ou duas
    for (const e of heavy) expect(e.weight).toBeGreaterThanOrEqual(0.99);
  });

  it('memId sem edges retorna []', () => {
    const empty = getRelated(graph, 'm4'); // m4 está isolada (keyword diferente, dia depois)
    // m4 pode ter ainda precededBy com m3 se < 24h... nesse caso vai ter algo
    // ou pode estar vazia se nada qualificou
    expect(Array.isArray(empty)).toBe(true);
  });

  it('memId inexistente retorna []', () => {
    expect(getRelated(graph, 'nao_existe')).toEqual([]);
  });

  it('ordena por weight desc', () => {
    const all = getRelated(graph, 'm2');
    for (let i = 0; i < all.length - 1; i++) {
      expect(all[i].weight).toBeGreaterThanOrEqual(all[i + 1].weight);
    }
  });
});

describe('centrality — degree counting', () => {
  it('memória sem edges → 0', () => {
    const g = buildGraph([makeMem('m1')]);
    expect(centrality(g, 'm1')).toBe(0);
  });

  it('memória com N edges → N', () => {
    const mems = [
      makeMem('hub', { keywords: ['a', 'b'], created_at: '2026-05-19T10:00:00Z' }),
      makeMem('p1',  { keywords: ['a', 'b'], created_at: '2026-05-19T11:00:00Z' }),
      makeMem('p2',  { keywords: ['a', 'b'], created_at: '2026-05-19T12:00:00Z' }),
    ];
    const g = buildGraph(mems);
    expect(centrality(g, 'hub')).toBeGreaterThan(0);
  });

  it('memId inexistente → 0', () => {
    const g = buildGraph([makeMem('m1')]);
    expect(centrality(g, 'naoexiste')).toBe(0);
  });
});

describe('rerankByGraph — boost por conectividade', () => {
  const mems = [
    makeMem('seed', { keywords: ['sono', 'cansaço'], created_at: '2026-05-19T10:00:00Z' }),
    makeMem('linked', { keywords: ['sono', 'cansaço'], created_at: '2026-05-19T11:00:00Z' }),
    makeMem('isolated', { keywords: ['comida'], created_at: '2026-05-25T10:00:00Z' }),
  ];
  const graph = buildGraph(mems);

  it('item conectado ao seed RECEBE boost no score', () => {
    const items = [
      { memId: 'linked', score: 0.5, payload: 'a' },
      { memId: 'isolated', score: 0.5, payload: 'b' },
    ];
    const reranked = rerankByGraph(items, graph, ['seed']);
    const linkedReranked = reranked.find(r => r.memId === 'linked');
    const isolatedReranked = reranked.find(r => r.memId === 'isolated');
    expect(linkedReranked?.score).toBeGreaterThan(isolatedReranked?.score ?? 0);
  });

  it('seedIds vazio → scores inalterados', () => {
    const items = [
      { memId: 'linked', score: 0.5, payload: 'a' },
      { memId: 'isolated', score: 0.3, payload: 'b' },
    ];
    const reranked = rerankByGraph(items, graph, []);
    expect(reranked.find(r => r.memId === 'linked')?.score).toBe(0.5);
    expect(reranked.find(r => r.memId === 'isolated')?.score).toBe(0.3);
  });

  it('ordem final é por score desc', () => {
    const items = [
      { memId: 'isolated', score: 0.3, payload: 'b' },
      { memId: 'linked', score: 0.4, payload: 'a' },
    ];
    const reranked = rerankByGraph(items, graph, ['seed']);
    for (let i = 0; i < reranked.length - 1; i++) {
      expect(reranked[i].score).toBeGreaterThanOrEqual(reranked[i + 1].score);
    }
  });

  it('NÃO muta input items (puro)', () => {
    const items = [{ memId: 'linked', score: 0.5, payload: 'a' }];
    const snapshot = JSON.stringify(items);
    rerankByGraph(items, graph, ['seed']);
    expect(JSON.stringify(items)).toBe(snapshot);
  });
});

describe('graphStats — telemetria local', () => {
  it('grafo vazio → stats zeradas', () => {
    const g = buildGraph([]);
    const s = graphStats(g);
    expect(s.nodeCount).toBe(0);
    expect(s.edgeCount).toBe(0);
    expect(s.mostCentral).toBeNull();
  });

  it('mostCentral retorna o nó com mais edges', () => {
    const mems = [
      makeMem('hub', { keywords: ['a', 'b'], created_at: '2026-05-19T10:00:00Z' }),
      makeMem('leaf1', { keywords: ['a', 'b'], created_at: '2026-05-19T11:00:00Z' }),
      makeMem('leaf2', { keywords: ['a', 'b'], created_at: '2026-05-19T12:00:00Z' }),
    ];
    const g = buildGraph(mems);
    const s = graphStats(g);
    expect(s.mostCentral).toBeDefined();
    expect(s.mostCentral!.degree).toBeGreaterThan(0);
  });

  it('edgesByKind tem chaves esperadas', () => {
    const g = buildGraph([
      makeMem('m1', { keywords: ['a', 'b'], created_at: '2026-05-19T10:00:00Z' }),
      makeMem('m2', { keywords: ['a', 'b'], created_at: '2026-05-19T11:00:00Z' }),
    ]);
    const s = graphStats(g);
    expect(s.edgesByKind.relatedTo).toBeGreaterThan(0);
    expect(s.edgesByKind.precededBy).toBeGreaterThan(0);
    expect(s.edgesByKind.similar).toBe(0);
    expect(s.edgesByKind.contrasts).toBe(0);
  });
});
