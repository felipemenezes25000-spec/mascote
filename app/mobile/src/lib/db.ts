/**
 * Re-export proxy.
 *
 * O monolito de 1351 linhas foi quebrado em `lib/db/<domain>.ts`. Esse arquivo
 * existe pra (a) preservar imports legados (`@/lib/db`), (b) servir como
 * "fachada" pública do package — quem quiser importar de `lib/db` ainda
 * funciona.
 *
 * Se você está adicionando uma operação nova:
 *  1. Edite o módulo correspondente em `lib/db/<domain>.ts`.
 *  2. Garanta que `lib/db/index.ts` re-exporta a função/objeto.
 *  3. Não toque AQUI — só re-export é o ponto.
 */
export * from './db/index';
