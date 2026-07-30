import pino from 'pino';

export function createLogger(level: string) {
  return pino({
    level,
    redact: {
      paths: [
        'authorization',
        'headers.authorization',
        '*.token',
        '*.privateKey',
        '*.webhookSecret',
        '*.apiKey',
      ],
      censor: '[REDACTED]',
    },
  });
}
