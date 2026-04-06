# EventFlow+

**Event-driven automation and processing platform** — ingest events, evaluate rules, execute actions asynchronously (webhooks, email hooks, notifications).

**Repository:** [github.com/einnerchaos/eventflow-plus](https://github.com/einnerchaos/eventflow-plus)

Stack: **NestJS · TypeScript · PostgreSQL · Prisma · Redis · BullMQ · Vue 3** (admin UI).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![CI](https://github.com/einnerchaos/eventflow-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/einnerchaos/eventflow-plus/actions/workflows/ci.yml)

---

## Why this project

Typical CRUD APIs handle one request at a time. EventFlow+ shows patterns closer to real integration platforms:

| Topic | What you can point to in this repo |
|--------|-------------------------------------|
| Async processing | BullMQ workers, separate action execution from HTTP ingestion |
| Idempotency | `correlationId` + Redis/DB deduplication per source |
| Resilience | BullMQ retries with backoff; dead-letter record after max attempts |
| Rule engine | Nested AND/OR conditions evaluated against JSON payloads |
| Observability | Prometheus metrics, execution audit trail, admin dashboard |

---

## Architecture (high level)

```
External systems (API key) → POST /api/v1/events
        → Persist event → Queue: rule evaluation
        → Match rules → Queue: actions (e.g. CALL_WEBHOOK)
        → Workers execute → Retries → Dead letter on final failure
```

Admin users use **JWT**; event producers use **per-source API keys**.

---

## Quick start (Docker)

**Prerequisites:** Docker with Compose plugin, ports **3000**, **5432**, **6379**, **8080** free.

```bash
git clone https://github.com/einnerchaos/eventflow-plus.git
cd eventflow-plus

docker compose up -d --build
```

**Apply database schema and seed demo data** (run once after first start):

```bash
docker compose exec api npx prisma db push
docker compose exec api npx prisma db seed
```

**URLs**

| What | URL |
|------|-----|
| Admin UI (nginx → API) | http://localhost:8080 |
| API (direct) | http://localhost:3000/api/v1 |
| OpenAPI (Swagger) | http://localhost:3000/api/docs |
| Health | http://localhost:3000/health |
| Prometheus metrics | http://localhost:3000/metrics |

**Default admin (from seed):** see `prisma/seed.ts` — typically `admin@eventflow.com` / `Admin123!`. **Change or disable for anything beyond local demos.**

**Create an event source** in the UI (or API), copy the **API key**, then:

```bash
curl -s -X POST http://localhost:8080/api/v1/events \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_SOURCE_API_KEY" \
  -d '{"eventType":"payment.completed","correlationId":"demo-1","payload":{"amount":5000,"currency":"USD"}}'
```

---

## Rule conditions and `payload`

The ingestion body is `{ "eventType", "correlationId?", "payload": { ... } }`. The rule engine evaluates conditions against the **`payload` object as the root**.

- If you send `"payload": { "amount": 100 }`, use condition field **`amount`**, not `payload.amount`.
- Use dot paths for nesting, e.g. **`order.total`** for `{ "order": { "total": 50 } }`.

---

## Local development (without full Docker app)

```bash
cp .env.example .env
# Start Postgres + Redis (e.g. via Docker) and match DATABASE_URL / REDIS_* in .env

npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run start:dev
```

Frontend (separate terminal):

```bash
cd frontend
npm install
npm run dev
```

Use `frontend/.env` or Vite proxy as needed so the UI talks to `http://localhost:3000`.

---

## Tests & CI

Lockfiles (`package-lock.json` in the root and in `frontend/`) are committed so CI uses **`npm ci`** for reproducible installs.

```bash
npm test              # Unit tests (Jest)
npm run test:cov      # Coverage
npm run test:e2e      # Requires Postgres + Redis + env (see .github/workflows/ci.yml)
npm run build
npm run lint:ci       # ESLint without --fix (as in CI)
```

GitHub Actions (`.github/workflows/ci.yml`) runs **lint, unit tests, build, e2e smoke**, and **Vue production build** against **Postgres** and **Redis** service containers.

**Node:** use **20.x** (see `.nvmrc`). Newer Node versions may break native deps such as `bcrypt`.

---

## API overview

| Area | Auth | Examples |
|------|------|----------|
| Login / refresh | — / JWT | `POST /api/v1/auth/login` |
| Sources | JWT (admin for create) | `POST /api/v1/sources` |
| Events ingest | `X-API-Key` | `POST /api/v1/events` |
| Events list | JWT | `GET /api/v1/events` |
| Rules | JWT (admin for mutations) | `POST /api/v1/rules` |
| Executions | JWT | `GET /api/v1/executions` |
| Queue stats (JSON) | JWT admin | `GET /api/v1/admin/queues/stats` |
| Metrics (Prometheus text) | — | `GET /metrics` |

Full contract: **Swagger** at `/api/docs`.

---

## Prometheus metrics (implemented names)

Examples: `events_received_total`, `events_failed_total`, `executions_created_total`, `executions_completed_total`, `executions_dead_lettered_total`, `rules_evaluated_total`, `queue_depth`, `webhook_requests_total`, …

See `src/common/metrics/metrics.service.ts` for the full set.

---

## Security notes

- Do not commit `.env`. Use strong secrets in production (`JWT_*`, `API_KEY_SALT`).
- See [SECURITY.md](./SECURITY.md) for reporting vulnerabilities.
- Per-source API keys are hashed; treat plaintext keys like passwords.

**Roadmap / not claimed here:** API rate limiting per source is not implemented in code today; the stack is suitable to add it (e.g. Redis token bucket or gateway).

---

## Project layout

```
eventflow-plus/
├── src/                 # NestJS API + workers
├── frontend/            # Vue 3 admin dashboard
├── prisma/              # schema + seed
├── tests/e2e/           # Smoke e2e
├── tests/unit/          # Unit tests
├── docker-compose.yml
└── docker/Dockerfile
```

---

## License

[MIT](./LICENSE)

---

## Acknowledgments

NestJS, BullMQ, Prisma, Prometheus, Vue, and the open-source ecosystem this project builds on.
