# StockVista — Local Development Setup

This project is a full-stack TypeScript app generated on Replit. It bundles an Express server and a Vite + React client in a single Node process.

- Server entry: `server/index.ts`
- Vite config: `vite.config.ts`
- Dev server and API share the same port: `PORT` (default 5000)
- Production client build served from `dist/public/`

## Prerequisites
- Node.js 20+
- npm 9+

## Environment variables
Create a file named `.env.local` in the project root. Example keys used by the app:

- `PORT=5000`
- `OPENAI_API_KEY=...` (required for AI analysis endpoints)
- `OPENAI_MODEL=gpt-4o-mini`
- `OPENAI_MAX_TOKENS=2000`
- `OPENAI_TEMPERATURE=0.7`
- `POLYGON_API_KEY=...` (used to fetch market data)
- `NEXT_PUBLIC_POLYGON_API_KEY=...` (same key exposed to client if needed)

Never commit real secrets. `.gitignore` already excludes `.env` and `.env.local`.

## Install
```
npm install
```

If you pulled updates that changed `package.json`, a clean install is recommended:
```
npm ci
```

## Run in development
This runs Express via `tsx` and mounts Vite as middleware for the React client with HMR.
```
npm run dev
```
Then open:
- http://localhost:5000 (client)
- http://localhost:5000/health (server health)
- http://localhost:5000/api/stocks (sample API)

## Build for production
```
npm run build
```
Artifacts:
- Client build: `dist/public/`
- Server bundle: `dist/index.js`

## Start in production mode (after build)
```
npm start
```
The server will serve static assets from `dist/public/` and all API routes under `/api/*`.

## Notes
- Windows-friendly scripts: `cross-env` is used for `NODE_ENV` in `package.json`.
- Env loading: `dotenv` is initialized in `server/index.ts` to load `.env.local`.
- Data storage: The current implementation uses in-memory storage (`server/storage.ts`). No database is required to run locally.
- External APIs: Network calls are made to Polygon and Yahoo Finance. If you lack API access or rate limits are hit, the app falls back to mock/test data in some paths.

## Troubleshooting
- Port already in use: set a different `PORT` in `.env.local`.
- OpenAI 401/403: set a valid `OPENAI_API_KEY`.
- Polygon key missing: set `POLYGON_API_KEY` or `NEXT_PUBLIC_POLYGON_API_KEY`.
- TypeScript errors: run `npm run check`.
