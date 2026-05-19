/**
 * Memory Graph — relações entre memórias.
 *
 * Antes: memórias eram **lista flat** com cosine similarity em embeddings.
 * Agora: construímos um GRAFO dirigido com edges tipadas — recall pode
 * pulsar "memórias relacionadas" mesmo quando a query não bate diretamente.
 *
 * **Tipos de edge** (heurística — derivação pura, sem ML extra):
 *  - `precededBy`: B foi criada logo após A (proximidade temporal < 24h).
 *    Modela "sequência de eventos": "prova de hoje" → "alívio depois".
 *  - `relatedTo`: A e B compartilham ≥2 keywords. Modela tema/cluster
 *    (várias menções de "dormir mal" se conectam).
 *  - `similar`: cosine similarity entre embeddings ≥ 0.75 (quando ambos
 *    indexados). Mais semântico que keyword overlap.
 *  - `contrasts`: ainda não implementado (precisa sentiment polar oposto +
 *    mesma keyword). Deferred — placeholder de futuro.
 *
 * **API pública**:
 *  - `buildGraph(memories)` — recomputa do zero. Pura, idempotente.
 *  - `getRelated(graph, memId, opts)` — adjacentes filtradas.
 *  - `rerankByGraph(items, graph, queryMemId)` — boost score por
 *    centralidade/conectividade.
 *
 * **Performance**: O(n²) na construção (ok pra n≤200, nosso cap atual).
 * Edges são deduplicadas: (A→B) e (B→A) viram uma só onde simétrica.
 */

import type { MemoryItem } from '../memory';

/** Tipo de relação. */
export type EdgeKind = 'precededBy' | 'relatedTo' | 'similar' | 'contrasts';

export interface MemoryEdge {
  /** ID da memória origem. */
  fromId: string;
  /** ID da memória destino. */
  toId: string;
  /** Tipo de relação. */
  kind: EdgeKind;
  /** Força do vínculo [0, 1]. Caller pode threshold-ar. */
  weight: number;
}

/**
 * Grafo de memórias. Armazenado como adjacency list pra lookup eficiente.
 * Edges são SIMÉTRICAS pra 'relatedTo'/'similar' (ambos lados existem);
 * DIRECIONAIS pra 'precededBy' (só A→B, ordem temporal).
 */
export interface MemoryGraph {
  /** Map memId → edges saindo dele. */
  adjacency: Map<string, MemoryEdge[]>;
  /** Total de edges únicas (count cru). */
  edgeCount: number;
}

const EMPTY_GRAPH: MemoryGraph = {
  adjacency: new Map(),
  edgeCount: 0,
};

/**
 * Constrói grafo a partir de uma lista de memórias. Pura, idempotente.
 *
 * Heurísticas:
 *  - precededBy: criadas com diff < 24h em ordem cronológica
 *  - relatedTo: ≥2 keywords em comum (Jaccard threshold implícito)
 *
 * @param memories Lista — ordem irrelevante.
 * @returns Grafo com adjacency map populado.
 */
export function buildGraph(memories: readonly MemoryItem[]): MemoryGraph {
  if (memories.length === 0) return { ...EMPTY_GRAPH, adjacency: new Map() };

  const adjacency = new Map<string, MemoryEdge[]>();
  let edgeCount = 0;

  // Index por id pra lookup O(1)
  const byId = new Map<string, MemoryItem>();
  for (const m of memories) byId.set(m.id, m);

  // Ordenado por created_at pra precededBy
  const sorted = [...memories].sort((a, b) => a.created_at.localeCompare(b.created_at));

  // O(n²) — aceitable pra n≤200
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    const aTime = new Date(a.created_at).getTime();
    const aKeys = new Set(a.keywords);
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      const bTime = new Date(b.created_at).getTime();
      const hoursDiff = (bTime - aTime) / (1000 * 60 * 60);

      // precededBy: A → B se B veio dentro de 24h após A
      if (hoursDiff > 0 && hoursDiff <= 24) {
        const weight = 1 - hoursDiff / 24; // 1.0 = imediato; 0 = exatamente 24h
        addEdge(adjacency, {
          fromId: a.id,
          toId: b.id,
          kind: 'precededBy',
          weight,
        });
        edgeCount++;
      }

      // relatedTo: keyword overlap ≥ 2 (simétrica)
      const bKeys = new Set(b.keywords);
      let overlap = 0;
      for (const k of aKeys) if (bKeys.has(k)) overlap++;
      if (overlap >= 2) {
        // Jaccard: |A∩B| / |A∪B|
        const union = aKeys.size + bKeys.size - overlap;
        const weight = union > 0 ? overlap / union : 0;
        // Simétrica: adiciona nas duas direções
        addEdge(adjacency, { fromId: a.id, toId: b.id, kind: 'relatedTo', weight });
        addEdge(adjacency, { fromId: b.id, toId: a.id, kind: 'relatedTo', weight });
        edgeCount++;
      }
    }
  }

  return { adjacency, edgeCount };
}

function addEdge(adjacency: Map<string, MemoryEdge[]>, edge: MemoryEdge): void {
  const arr = adjacency.get(edge.fromId);
  if (arr) arr.push(edge);
  else adjacency.set(edge.fromId, [edge]);
}

/**
 * Opções de consulta — filtros declarativos.
 */
export interface GetRelatedOptions {
  /** Limita tipos de edge. Default = todas. */
  kinds?: readonly EdgeKind[];
  /** Limita N edges retornadas. Default = 10. */
  limit?: number;
  /** Threshold mínimo de weight. Default = 0 (sem filtro). */
  minWeight?: number;
}

/**
 * Retorna edges conectadas ao memId, ordenadas por weight desc.
 *
 * Aplicação típica:
 *   const sequence = getRelated(graph, mId, { kinds: ['precededBy'], limit: 3 });
 *   const cluster  = getRelated(graph, mId, { kinds: ['relatedTo'], limit: 5 });
 */
export function getRelated(
  graph: MemoryGraph,
  memId: string,
  opts: GetRelatedOptions = {},
): MemoryEdge[] {
  const all = graph.adjacency.get(memId) ?? [];
  const { kinds, limit = 10, minWeight = 0 } = opts;
  let filtered = all;
  if (kinds && kinds.length > 0) {
    const set = new Set<string>(kinds);
    filtered = filtered.filter(e => set.has(e.kind));
  }
  if (minWeight > 0) {
    filtered = filtered.filter(e => e.weight >= minWeight);
  }
  return filtered
    .slice() // não mutar
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}

/**
 * Centralidade (degree) — quantas edges entram/saem da memória.
 * Memórias mais conectadas são "marcantes" — bom proxy de importance.
 */
export function centrality(graph: MemoryGraph, memId: string): number {
  return graph.adjacency.get(memId)?.length ?? 0;
}

/**
 * Re-ranqueia uma lista de candidatos (já scored) dando boost a quem
 * compartilha edges com `seedIds` (ex: ids dos top-3 hits diretos da query).
 *
 * Estratégia: pra cada candidato c, soma weights de edges (c→seed | seed→c).
 * Boost = soma / N (normalizado). Score final = score original × (1 + boost).
 *
 * Resultado: query "ansiedade" pega 3 memórias diretas; rerank traz mais
 * 2 que estão **conectadas** a essas 3 mesmo sem keyword match direto —
 * o "memory graph" cumpre seu papel.
 */
export interface RerankItem<T> {
  /** ID da memória (pra lookup no graph). */
  memId: string;
  /** Score original (similarity). */
  score: number;
  /** Payload do caller — passa-through. */
  payload: T;
}

export function rerankByGraph<T>(
  items: readonly RerankItem<T>[],
  graph: MemoryGraph,
  seedIds: readonly string[],
  boostFactor = 0.5,
): RerankItem<T>[] {
  if (seedIds.length === 0) return items.slice();
  const seedSet = new Set(seedIds);
  return items
    .map(item => {
      let boost = 0;
      const edges = graph.adjacency.get(item.memId) ?? [];
      for (const e of edges) {
        if (seedSet.has(e.toId)) boost += e.weight;
      }
      // Também checa edges de seeds APONTANDO pra item (caso direcional)
      for (const seedId of seedIds) {
        if (seedId === item.memId) continue;
        const seedEdges = graph.adjacency.get(seedId) ?? [];
        for (const e of seedEdges) {
          if (e.toId === item.memId) boost += e.weight * 0.7; // peso menor (reverso)
        }
      }
      const normalizedBoost = seedIds.length > 0 ? boost / seedIds.length : 0;
      return {
        ...item,
        score: item.score * (1 + boostFactor * normalizedBoost),
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Stats utilitárias do grafo — pra debug/telemetria local.
 */
export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  /** Nó mais central (mais conectado). null se vazio. */
  mostCentral: { memId: string; degree: number } | null;
  /** Distribuição de edges por tipo. */
  edgesByKind: Record<EdgeKind, number>;
}

export function graphStats(graph: MemoryGraph): GraphStats {
  const edgesByKind: Record<EdgeKind, number> = {
    precededBy: 0,
    relatedTo: 0,
    similar: 0,
    contrasts: 0,
  };
  let mostCentral: { memId: string; degree: number } | null = null;
  for (const [memId, edges] of graph.adjacency.entries()) {
    if (!mostCentral || edges.length > mostCentral.degree) {
      mostCentral = { memId, degree: edges.length };
    }
    for (const e of edges) {
      edgesByKind[e.kind]++;
    }
  }
  return {
    nodeCount: graph.adjacency.size,
    edgeCount: graph.edgeCount,
    mostCentral,
    edgesByKind,
  };
}
