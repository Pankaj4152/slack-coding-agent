# Agent instructions

- Use Node.js 20 or newer and strict TypeScript.
- Keep this integration as one process with SQLite; do not introduce queues or additional services.
- Run `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm test` after changes.
- Never commit credentials, `.env`, SQLite files, or logs.
- Preserve the explicit GitHub issue markers and Slack thread mapping contract.
- Never add automatic merge behavior.
