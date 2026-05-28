# Atelier Gallery — mock JSON server

Stub HTTP que persiste shared looks em arquivo local.
Sem deps, Node puro. Dev/staging only.

## Run

```bash
node app/server/atelier-gallery/server.mjs
# ou
cd app/server/atelier-gallery && npm start
```

Default port 4174. Override via `PORT=8080 node server.mjs`.

## Endpoints

- `GET /health` — healthcheck
- `GET /api/gallery` — lista todos os looks publicados
- `GET /api/gallery/:id` — fetch por id
- `POST /api/gallery` — publica um look (body = SharedLook)
- `DELETE /api/gallery/:id` — remove (sem auth, dev only)

## Storage

`./data/gallery.json`. Atomico via write+rename. `.gitignore` cobre `data/`.

## Backend final

Esse stub eh provisorio. Decisao final do backend depende de Felipe.
O cliente RN (`src/lib/atelier/gallery-client.ts`) abstrai a transport
pra facilitar troca.
