# Mascote — landing (Next.js)

Site de marketing em **Next.js 14** + Tailwind. Rotas i18n (`pt` / `en`), manifesto, newsletter e páginas legais.

## Rodar local

```bash
cd app/web
npm install
npm run dev
```

Abre em `http://localhost:3000`.

## Build

```bash
npm run build
npm run start
```

## Estrutura

```
app/web/
├── app/              # App Router (pages por idioma)
├── components/       # Hero, Header, Mascot preview, etc.
├── messages/         # pt.json, en.json
└── middleware.ts     # redirect de locale
```

O app mobile fica em `../mobile/`. Documentação geral: [README.md](../../README.md) na raiz.
