import 'reflect-metadata';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createNestApp } from '../apps/api/src/create-app';

/**
 * Vercel's Node.js runtime picks up any file under /api and treats its default export as
 * the handler — this is the whole app, routed through Nest's Express adapter rather than
 * apps/api/src/main.ts's `app.listen()` (which doesn't mean anything on serverless).
 *
 * The Nest app is built once and reused across invocations on a warm instance — express's
 * request handler is cheap to call repeatedly, but re-running module init (DB connections,
 * etc.) on every request would be slow and wasteful. A failed bootstrap resets the cache so
 * the next invocation retries instead of being stuck replaying the same rejected promise.
 *
 * The 1:1 chat WebSocket gateway is intentionally NOT wired into this same handler — it
 * lives at api/socket.ts as its own isolated Vercel Function instead. Vercel's WebSocket
 * support requires the default export to be a real http.Server built synchronously at
 * module scope, a fundamentally different shape than this callback-style handler; forcing
 * that shape onto the main REST entry point risked destabilizing every other endpoint for
 * an unverified benefit. See api/socket.ts for the reasoning in full.
 */
let handlerPromise: Promise<(req: VercelRequest, res: VercelResponse) => void> | null = null;

async function buildHandler() {
  const app = await createNestApp();
  await app.init();
  const instance = app.getHttpAdapter().getInstance();
  return (req: VercelRequest, res: VercelResponse) => instance(req, res);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handlerPromise) {
    handlerPromise = buildHandler().catch((err) => {
      handlerPromise = null;
      throw err;
    });
  }
  const expressHandler = await handlerPromise;
  expressHandler(req, res);
}
