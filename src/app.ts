import Fastify from 'fastify';
import type { Logger } from 'pino';
import type { GithubWebhookHandler } from './github/webhook-handler.js';
import { verifyWebhookSignature } from './github/webhook-signature.js';

export function createHttpServer(options: {
  webhookSecret: string;
  webhookHandler: GithubWebhookHandler;
  logger: Logger;
}) {
  const server = Fastify({
    loggerInstance: options.logger,
    bodyLimit: 1_048_576,
    disableRequestLogging: false,
  });

  server.removeAllContentTypeParsers();
  server.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_request, body, done) => {
    done(null, body);
  });

  server.get('/health', async () => ({ status: 'ok' }));
  server.post('/webhooks/github', async (request, reply) => {
    const raw = request.body;
    if (!Buffer.isBuffer(raw)) return reply.code(400).send({ error: 'Expected JSON payload' });
    const signature = request.headers['x-hub-signature-256'];
    if (
      !verifyWebhookSignature(
        raw,
        typeof signature === 'string' ? signature : undefined,
        options.webhookSecret,
      )
    ) {
      return reply.code(401).send({ error: 'Invalid webhook signature' });
    }
    const eventName = request.headers['x-github-event'];
    const deliveryId = request.headers['x-github-delivery'];
    if (typeof eventName !== 'string' || typeof deliveryId !== 'string') {
      return reply.code(400).send({ error: 'Missing GitHub webhook headers' });
    }
    let payload: unknown;
    try {
      payload = JSON.parse(raw.toString('utf8'));
    } catch {
      return reply.code(400).send({ error: 'Invalid JSON payload' });
    }
    try {
      await options.webhookHandler.handle(eventName, deliveryId, payload);
      return reply.code(202).send({ accepted: true });
    } catch (error) {
      options.logger.error(
        { err: error, eventType: eventName, deliveryId },
        'Webhook processing failed',
      );
      return reply.code(500).send({ error: 'Webhook processing failed' });
    }
  });

  return server;
}
