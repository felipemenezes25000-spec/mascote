/**
 * Mock JSON server pra atelier gallery — stub HTTP API simples.
 *
 * Por que aqui:
 *   Felipe ainda nao decidiu backend final (Supabase? Hono? Edge function?).
 *   Esse stub roda em Node puro (sem deps), com endpoints CRUD basicos pra
 *   permitir wire-up do cliente RN antes da decisao infra.
 *
 * Storage: arquivo JSON local (./data/gallery.json). Atomico via write
 * temp + rename. Sem auth, sem rate limit — pra dev local apenas.
 *
 * Endpoints:
 *   GET  /health                        -> {ok: true, ts}
 *   GET  /api/gallery                   -> {looks: SharedLook[]}
 *   GET  /api/gallery/:id               -> SharedLook
 *   POST /api/gallery   {body: SharedLook} -> SharedLook (com id)
 *   DELETE /api/gallery/:id             -> {ok: true}
 *
 * Run: node app/server/atelier-gallery/server.mjs
 * Port: process.env.PORT ?? 4174
 */

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'gallery.json');
const PORT = Number(process.env.PORT ?? 4174);

const SCHEMA = 1;
const MAX_LOOKS = 1000; // server-side cap conservador
// Bound de payload por request — sem isso, cliente hostil pode mandar 1GB de
// body, acumula em memoria via `chunks.push(c)` e mata o processo (OOM/DoS).
// 256KB cobre snapshots de look completos com folga (typical < 30KB).
const MAX_BODY_BYTES = 256 * 1024;

async function ensureData() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ schema: SCHEMA, looks: [] }, null, 2));
  }
}

async function readStore() {
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  const parsed = JSON.parse(raw);
  if (parsed.schema !== SCHEMA) {
    throw new Error(`gallery schema mismatch: got ${parsed.schema}, expected ${SCHEMA}`);
  }
  return parsed;
}

async function writeStore(store) {
  const tmp = DATA_FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(store, null, 2));
  await fs.rename(tmp, DATA_FILE);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let aborted = false;
    req.on('data', c => {
      if (aborted) return;
      total += c.length;
      if (total > MAX_BODY_BYTES) {
        aborted = true;
        // Destroi o socket pra parar de receber bytes — apenas `reject` não
        // impede o cliente de continuar streaming chunk-after-chunk.
        req.destroy();
        reject(new Error(`payload too large (>${MAX_BODY_BYTES} bytes)`));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (aborted) return;
      const buf = Buffer.concat(chunks).toString('utf-8');
      if (!buf) return resolve({});
      try {
        resolve(JSON.parse(buf));
      } catch (e) {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', err => {
      if (aborted) return;
      reject(err);
    });
  });
}

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(JSON.stringify(body));
}

function validateLook(input) {
  if (!input || typeof input !== 'object') return 'body deve ser objeto';
  if (input.schema !== SCHEMA) return `schema deve ser ${SCHEMA}`;
  if (typeof input.name !== 'string' || !input.name.trim()) return 'name obrigatorio';
  if (input.name.length > 30) return 'name max 30 chars';
  if (!input.snapshot || typeof input.snapshot !== 'object') return 'snapshot obrigatorio';
  return null;
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, { ok: true, ts: new Date().toISOString() });
  }

  if (req.method === 'GET' && url.pathname === '/api/gallery') {
    const store = await readStore();
    return json(res, 200, { looks: store.looks });
  }

  const idMatch = url.pathname.match(/^\/api\/gallery\/([\w-]+)$/);

  if (req.method === 'GET' && idMatch) {
    const id = idMatch[1];
    const store = await readStore();
    const look = store.looks.find(l => l.id === id);
    if (!look) return json(res, 404, { error: 'not found' });
    return json(res, 200, look);
  }

  if (req.method === 'POST' && url.pathname === '/api/gallery') {
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      return json(res, 400, { error: e.message });
    }
    const err = validateLook(body);
    if (err) return json(res, 400, { error: err });

    const store = await readStore();
    if (store.looks.length >= MAX_LOOKS) {
      // FIFO server-side trim — mais antigos somem.
      store.looks = store.looks.slice(store.looks.length - MAX_LOOKS + 1);
    }
    const next = {
      id: randomUUID(),
      schema: SCHEMA,
      name: body.name.trim().slice(0, 30),
      snapshot: body.snapshot,
      shared_at: new Date().toISOString(),
    };
    store.looks.push(next);
    await writeStore(store);
    return json(res, 201, next);
  }

  if (req.method === 'DELETE' && idMatch) {
    const id = idMatch[1];
    const store = await readStore();
    const before = store.looks.length;
    store.looks = store.looks.filter(l => l.id !== id);
    if (store.looks.length === before) return json(res, 404, { error: 'not found' });
    await writeStore(store);
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: 'unknown route' });
}

async function main() {
  await ensureData();
  const server = http.createServer((req, res) => {
    handle(req, res).catch(err => {
      console.error('[gallery] handler error:', err);
      json(res, 500, { error: 'internal error' });
    });
  });
  server.listen(PORT, () => {
    console.log(`[gallery] listening on http://localhost:${PORT}`);
    console.log(`[gallery] data file: ${DATA_FILE}`);
  });
}

// Auto-start unless imported as module.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('[gallery] fatal:', err);
    process.exit(1);
  });
}

export { handle, readStore, writeStore, DATA_FILE };
