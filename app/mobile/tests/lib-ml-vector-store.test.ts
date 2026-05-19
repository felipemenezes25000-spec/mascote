import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VectorStore } from '@/lib/ml/store/vector-store';

declare const __asyncStorageReset: () => void;

const NS = 'test-vec';

function vec(...xs: number[]): number[] {
  return xs;
}

describe('VectorStore', () => {
  beforeEach(() => {
    __asyncStorageReset();
  });

  it('upsert adiciona registro novo', async () => {
    const s = new VectorStore(NS);
    await s.upsert({ id: '1', vector: vec(1, 0, 0), created_at: 'x' });
    expect(await s.size()).toBe(1);
  });

  it('upsert sobrescreve registro existente pelo id', async () => {
    const s = new VectorStore(NS);
    await s.upsert({ id: '1', vector: vec(1, 0, 0), created_at: 'x' });
    await s.upsert({ id: '1', vector: vec(0, 1, 0), created_at: 'y' });
    const list = await s.list();
    expect(list.length).toBe(1);
    expect(list[0].vector).toEqual([0, 1, 0]);
  });

  it('search ordena por cosine similarity', async () => {
    const s = new VectorStore(NS);
    await s.upsert({ id: 'a', vector: vec(1, 0, 0), created_at: 'x' });
    await s.upsert({ id: 'b', vector: vec(0.5, 0.5, 0), created_at: 'x' });
    await s.upsert({ id: 'c', vector: vec(0.9, 0.1, 0), created_at: 'x' });
    // minScore default = 0 (`>`), então vetor ortogonal não aparece.
    // Aqui usamos vetores com similaridade > 0 pra todos.
    const r = await s.search(vec(1, 0, 0), { limit: 3 });
    expect(r.length).toBeGreaterThanOrEqual(2);
    expect(r[0].record.id).toBe('a');
    expect(r[1].record.id).toBe('c');
  });

  it('search respeita minScore', async () => {
    const s = new VectorStore(NS);
    await s.upsert({ id: 'a', vector: vec(1, 0, 0), created_at: 'x' });
    await s.upsert({ id: 'b', vector: vec(-1, 0, 0), created_at: 'x' });
    const r = await s.search(vec(1, 0, 0), { minScore: 0.5 });
    expect(r.length).toBe(1);
    expect(r[0].record.id).toBe('a');
  });

  it('search com filter elimina registros', async () => {
    const s = new VectorStore<{ tag: string }>(NS);
    await s.upsert({ id: 'a', vector: vec(1, 0), metadata: { tag: 'good' }, created_at: 'x' });
    await s.upsert({ id: 'b', vector: vec(1, 0), metadata: { tag: 'bad' }, created_at: 'x' });
    const r = await s.search(vec(1, 0), { filter: rec => rec.metadata?.tag === 'good' });
    expect(r.length).toBe(1);
    expect(r[0].record.id).toBe('a');
  });

  it('search ignora vetores com dim diferente', async () => {
    const s = new VectorStore(NS);
    await s.upsert({ id: 'a', vector: vec(1, 0, 0), created_at: 'x' });
    await s.upsert({ id: 'b', vector: vec(1, 0), created_at: 'x' }); // 2D
    const r = await s.search(vec(1, 0, 0));
    expect(r.length).toBe(1);
    expect(r[0].record.id).toBe('a');
  });

  it('remove apaga pelo id', async () => {
    const s = new VectorStore(NS);
    await s.upsert({ id: 'a', vector: vec(1, 0), created_at: 'x' });
    await s.upsert({ id: 'b', vector: vec(0, 1), created_at: 'x' });
    await s.remove('a');
    expect(await s.size()).toBe(1);
  });

  it('clear esvazia tudo + remove do storage', async () => {
    const s = new VectorStore(NS);
    await s.upsert({ id: 'a', vector: vec(1), created_at: 'x' });
    await s.clear();
    expect(await s.size()).toBe(0);
    expect(await AsyncStorage.getItem(`mascote:vec:${NS}`)).toBeNull();
  });

  it('FIFO eviction quando passa do cap', async () => {
    const s = new VectorStore(NS, 3);
    for (let i = 0; i < 5; i++) {
      await s.upsert({ id: 'r' + i, vector: vec(i), created_at: 'x' });
    }
    const list = await s.list();
    expect(list.length).toBe(3);
    expect(list[0].id).toBe('r2');
    expect(list[2].id).toBe('r4');
  });

  it('load reusa o estado persistido', async () => {
    const a = new VectorStore(NS);
    await a.upsert({ id: 'x', vector: vec(1, 0), created_at: 'x' });
    const b = new VectorStore(NS);
    const list = await b.list();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('x');
  });

  it('load com storage corrompido retorna []', async () => {
    await AsyncStorage.setItem(`mascote:vec:${NS}`, '{{{');
    const s = new VectorStore(NS);
    expect(await s.size()).toBe(0);
  });

  it('load com payload não-array é tratado como []', async () => {
    await AsyncStorage.setItem(`mascote:vec:${NS}`, JSON.stringify({ notArray: true }));
    const s = new VectorStore(NS);
    expect(await s.size()).toBe(0);
  });

  it('chamadas concorrentes de load() compartilham mesma promise', async () => {
    const s = new VectorStore(NS);
    const [, , ] = await Promise.all([s.load(), s.load(), s.load()]);
    expect(await s.size()).toBe(0);
  });
});
