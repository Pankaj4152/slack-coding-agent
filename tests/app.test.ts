import pino from 'pino';
import { describe, expect, it, vi } from 'vitest';
import { createHttpServer } from '../src/app.js';

describe('HTTP health endpoints', () => {
  function makeServer(readinessCheck: () => Promise<void>) {
    return createHttpServer({
      webhookSecret: 'secret',
      webhookHandler: { handle: vi.fn() } as any,
      logger: pino({ level: 'silent' }),
      readinessCheck,
    });
  }

  it('reports liveness on both supported health paths', async () => {
    const server = makeServer(async () => {});
    const [health, healthz] = await Promise.all([
      server.inject({ method: 'GET', url: '/health' }),
      server.inject({ method: 'GET', url: '/healthz' }),
    ]);
    expect(health.statusCode).toBe(200);
    expect(healthz.json()).toEqual({
      status: 'ok',
    });
    await server.close();
  }, 30_000);

  it('reports readiness only when the task store is reachable', async () => {
    const readyServer = makeServer(async () => {});
    expect((await readyServer.inject({ method: 'GET', url: '/readyz' })).json()).toEqual({
      status: 'ready',
    });
    await readyServer.close();

    const unavailableServer = makeServer(async () => {
      throw new Error('database unavailable');
    });
    const response = await unavailableServer.inject({ method: 'GET', url: '/readyz' });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'not_ready' });
    await unavailableServer.close();
  });
});
