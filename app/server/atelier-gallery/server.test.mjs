/**
 * Tests do gallery server — happy paths + error handling.
 *
 * Roda via `node --test app/server/atelier-gallery/server.test.mjs`.
 * Cria um data file temporario, inicia o handler sobre ele, faz
 * requests reais via http.request loopback.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Set custom data path before importing the module
const TMP_DIR = await fs.mkdtemp(path.join(os.tmpdir(), 'gallery-test-'));
const ORIGINAL_CWD = process.cwd();
process.chdir(TMP_DIR);

const mod = await import('./server.mjs');

let server;
const PORT = 14174;
const BASE = `http://127.0.0.1:${PORT}`;

test.before(async () => {
  await fs.mkdir(path.dirname(mod.DATA_FILE), { recursive: true });
  // Seed empty store so first read does not ENOENT.
  await fs.writeFile(mod.DATA_FILE, JSON.stringify({ schema: 1, looks: [] }));
  server = http.createServer((req, res) => {
    mod.handle(req, res).catch(err => {
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(err) }));
    });
  });
  await new Promise(r => server.listen(PORT, r));
});

test.after(async () => {
  await new Promise(r => server.close(r));
  process.chdir(ORIGINAL_CWD);
  await fs.rm(TMP_DIR, { recursive: true, force: true });
});

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request(
      `${BASE}${path}`,
      {
        method,
        headers: body ? { 'content-type': 'application/json', 'content-length': data.length } : {},
      },
      res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf-8');
          try {
            resolve({ status: res.statusCode, body: text ? JSON.parse(text) : null });
          } catch (e) {
            resolve({ status: res.statusCode, body: text });
          }
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

test('GET /health returns ok', async () => {
  const r = await request('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
});

test('GET /api/gallery returns empty list initially', async () => {
  const r = await request('GET', '/api/gallery');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.looks));
});

test('POST /api/gallery rejects body without schema', async () => {
  const r = await request('POST', '/api/gallery', { name: 'x', snapshot: {} });
  assert.equal(r.status, 400);
});

test('POST + GET + DELETE round trip', async () => {
  const post = await request('POST', '/api/gallery', {
    schema: 1,
    name: 'Vibe Teste',
    snapshot: { eye_size: 1 },
  });
  assert.equal(post.status, 201);
  const id = post.body.id;
  assert.ok(id);

  const get = await request('GET', `/api/gallery/${id}`);
  assert.equal(get.status, 200);
  assert.equal(get.body.name, 'Vibe Teste');

  const del = await request('DELETE', `/api/gallery/${id}`);
  assert.equal(del.status, 200);

  const getAfter = await request('GET', `/api/gallery/${id}`);
  assert.equal(getAfter.status, 404);
});

test('GET unknown id returns 404', async () => {
  const r = await request('GET', '/api/gallery/nonexistent');
  assert.equal(r.status, 404);
});

test('unknown route returns 404', async () => {
  const r = await request('GET', '/totally/unknown');
  assert.equal(r.status, 404);
});

test('POST with invalid JSON body returns 400', async () => {
  const data = '{not json';
  const r = await new Promise((resolve, reject) => {
    const req = http.request(
      `${BASE}/api/gallery`,
      { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': data.length } },
      res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode }));
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
  assert.equal(r.status, 400);
});

test('OPTIONS preflight returns 204', async () => {
  const r = await request('OPTIONS', '/api/gallery');
  assert.equal(r.status, 204);
});
