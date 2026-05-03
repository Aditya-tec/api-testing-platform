# Distributed API Workflow Execution Platform

A full-stack platform for **defining, running, and monitoring API test collections**—built to replace ad-hoc Postman runs with **repeatable execution, queued workers, results history, and metrics**.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT / BROWSER                             │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                  Next.js Dashboard                          │   │
│   │                                                             │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │   │
│   │   │ Collections │  │  Job Detail │  │     Metrics      │  │   │
│   │   │    Page     │  │  + Live Log │  │    Dashboard     │  │   │
│   │   └─────────────┘  └─────────────┘  └──────────────────┘  │   │
│   └────────────────────────────┬────────────────────────────────┘   │
└────────────────────────────────│────────────────────────────────────┘
                                 │ HTTP REST
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        EXPRESS API SERVER                           │
│                                                                     │
│   ┌──────────────┐  ┌──────────────┐  ┌───────────┐  ┌─────────┐  │
│   │  Collections │  │     Jobs     │  │  Metrics  │  │  Auth   │  │
│   │   /api/v1/   │  │   /api/v1/   │  │ /api/v1/  │  │Profiles │  │
│   │  collections │  │    jobs      │  │  metrics  │  │         │  │
│   └──────────────┘  └──────┬───────┘  └───────────┘  └─────────┘  │
│                             │                                       │
│   ┌─────────────────────────▼──────────────────────────────────┐   │
│   │                    Middleware Layer                         │   │
│   │   Helmet · CORS · Rate Limiter · Input Validator · SSRF    │   │
│   └─────────────────────────┬──────────────────────────────────┘   │
└─────────────────────────────│───────────────────────────────────────┘
                              │ Enqueue job ID
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        REDIS (Upstash)                              │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                     BullMQ Queue                            │   │
│   │              job-execution  ──────►  [jobId, jobId, ...]   │   │
│   └─────────────────────────────┬───────────────────────────────┘   │
└─────────────────────────────────│───────────────────────────────────┘
                                  │ Consume
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           WORKER PROCESS                            │
│                                                                     │
│   1. Fetch Job snapshot from MongoDB                                │
│   2. For each request in snapshot:                                  │
│                                                                     │
│      ┌──────────────────────────────────────────────────────────┐   │
│      │  SSRF Check → Inject Variables → Fire HTTP (axios)       │   │
│      │       ↓                ↓                  ↓              │   │
│      │  Block if          {{variable}}       Retry with         │   │
│      │  internal IP       replaced from      exponential        │   │
│      │  detected          prior response     backoff            │   │
│      └──────────────────────────────────────────────────────────┘   │
│                                                                     │
│   3. Write RequestResult + Log events back to MongoDB               │
│   4. Update Job status: PENDING → RUNNING → COMPLETED/PARTIAL/FAILED│
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       MONGODB ATLAS                                 │
│                                                                     │
│   ┌──────────────┐  ┌──────────────┐  ┌───────────────┐            │
│   │  Collection  │  │     Job      │  │ RequestResult │            │
│   │              │  │              │  │               │            │
│   │ name         │  │ collectionId │  │ jobId         │            │
│   │ requests[]   │  │ snapshot[]   │  │ requestIndex  │            │
│   │ executionMode│  │ authSnapshot │  │ httpStatus    │            │
│   │ authProfileId│  │ variables{}  │  │ latencyMs     │            │
│   │              │  │ status       │  │ retryCount    │            │
│   └──────────────┘  └──────────────┘  └───────────────┘            │
│                                                                     │
│   ┌──────────────┐  ┌──────────────────────────────────────────┐   │
│   │  AuthProfile │  │                  Log                     │   │
│   │              │  │                                          │   │
│   │ name         │  │ event: JOB_STARTED                       │   │
│   │ type         │  │      | REQUEST_STARTED                   │   │
│   │ token (AES   │  │      | VAR_EXTRACTED                     │   │
│   │  encrypted)  │  │      | REQUEST_RETRYING                  │   │
│   │ headerName   │  │      | REQUEST_COMPLETED                 │   │
│   │              │  │      | REQUEST_SKIPPED                   │   │
│   └──────────────┘  │      | JOB_COMPLETED / PARTIAL / FAILED  │   │
│                     └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## What this app is for (use cases)

- **Regression checks for APIs**: run the same collection repeatedly and compare outcomes over time.
- **Smoke tests after deployments**: trigger a job run and review pass/fail by request.
- **Multi-step API workflows**: extract values from one response (e.g., `userId`, `token`) and inject them into later requests.
- **Team visibility & auditability**: keep a persistent execution history with per-request results and an event trail.
- **Performance awareness**: track latency trends and identify slow requests across many runs.

---

## Core concepts

- **Collection**: a saved definition of API requests (method, URL, headers, body, timeout) with an execution mode (sequential or parallel).
- **Job**: one execution of a collection. Jobs store a **snapshot** of the collection at run time so reruns stay deterministic even if the collection later changes.
- **Request Result**: one record per request within a job (status, HTTP status, latency, response snippet, retries, error message).
- **Event Log**: an append-only timeline for job execution (job/request lifecycle, retries, variable extraction events).
- **Auth Profile**: reusable credential storage (bearer token or API key) that can be linked to collections; secrets are **encrypted at rest** and never returned by the API.

---

## Key features

- **Queued execution with workers**: jobs are enqueued and processed by a separate worker process (with configurable concurrency via `WORKER_CONCURRENCY` env var).
- **Deterministic reruns**: rerun a job using the original request/auth snapshots via `POST /jobs/:id/rerun`.
- **Sequential "workflow" mode**: supports `{{variable}}` placeholders and response-to-variable extraction (dot-path rules) so later requests can depend on earlier outputs.
- **SKIP propagation**: if a request fails in sequential mode, all subsequent requests are marked `SKIPPED` — not silently ignored.
- **PARTIAL status**: jobs can finish as `COMPLETED`, `FAILED`, or `PARTIAL` — for when some requests pass and others fail.
- **Retries with exponential backoff**: request execution retries transient failures and records `REQUEST_RETRYING` log events with attempt number and reason.
- **Safety controls for outbound requests**: SSRF protection blocks private/internal network targets and unsafe protocols (including DNS-rebinding protection via pre-flight DNS resolution).
- **Credential security**: auth profile tokens are AES-256 encrypted in MongoDB; `authSnapshot.token` is always returned as `[REDACTED]` in API responses.
- **Observability endpoints**: global metrics and per-collection metrics (avg/min/max latency per request across all runs) via MongoDB aggregation pipelines.
- **OpenAPI documentation**: Swagger UI available at `/api/v1/docs`.
- **CI/CD pipeline**: GitHub Actions runs 27 tests on every push — deploy is blocked if any fail.

---

## System architecture (high level)

- **Frontend dashboard (`frontend/`)**
  - Create and manage collections
  - Trigger runs and review job detail (results + logs)
  - View system metrics and per-collection performance

- **Backend API (`src/`)**
  - REST resources for collections, jobs, metrics, and auth profiles
  - Persists definitions and execution history in MongoDB
  - Enqueues jobs to a Redis-backed queue

- **Worker (`src/jobs/worker.js`)**
  - Consumes queued jobs
  - Executes request snapshots (sequential orchestration, retries, variable extraction)
  - Writes request results + log events back to MongoDB

---

## Tech stack

### Frontend
- **Next.js** (App Router)
- **React**
- **Tailwind CSS**

### Backend
- **Node.js** + **Express**
- **MongoDB** + **Mongoose**
- **BullMQ** (job queue) + **Redis** (queue backend)
- **Axios** (outbound request execution)
- **Swagger / OpenAPI** via `swagger-jsdoc` + `swagger-ui-express`

### Security & reliability
- **Helmet** (security headers)
- **CORS** with environment-based origin control
- **Rate limiting** for API routes and job creation
- **SSRF protection** with DNS rebinding defence
- **Encrypted credentials** (AES-256 via `crypto-js`)
- **Graceful shutdown** for server and worker processes

### Infrastructure
- **MongoDB Atlas** — database
- **Upstash Redis** — serverless queue backend
- **Render** — backend hosting
- **Vercel** — frontend hosting
- **GitHub Actions** — CI/CD pipeline

---

## API surface (resources)

| Resource | Endpoints |
|---|---|
| Health | `GET /api/v1/health` |
| Collections | `GET/POST /collections` · `GET/PUT/DELETE /collections/:id` · `GET /collections/:id/jobs` |
| Jobs | `GET/POST /jobs` · `GET /jobs/:id` · `POST /jobs/:id/rerun` · `GET /jobs/:id/results` · `GET /jobs/:id/logs` |
| Metrics | `GET /metrics` · `GET /metrics/collections/:id` |
| Auth Profiles | `GET/POST /auth-profiles` · `GET/PUT/DELETE /auth-profiles/:id` |
| Docs | `GET /api/v1/docs` |

---

## Data model (at a glance)

- **`Collection`**: request definitions + execution mode + optional linked auth profile
- **`Job`**: snapshot of requests/auth + status + extracted variables + timestamps
- **`RequestResult`**: per-request status/latency/HTTP outcome/response snippet
- **`Log`**: structured event trail for auditing and debugging
- **`AuthProfile`**: reusable credential metadata + encrypted token at rest

---

## Environment variables

```
NODE_ENV=
PORT=5000
MONGO_URI=
REDIS_URL=
ENCRYPTION_SECRET=
WORKER_CONCURRENCY=5
INLINE_WORKER=true
FRONTEND_URL=
```

---

## Running locally

```bash
# Install dependencies
npm install

# Start API server
npm run dev

# Start worker (separate terminal)
npm run worker:dev

# Run tests
npm test
```

---

## Live deployment

| | URL |
|---|---|
| 🌐 Frontend | https://api-testing-platform-two.vercel.app |


---

## Repository layout

- **`src/`** — Express API, controllers, models, services, worker/queue logic
- **`frontend/`** — Next.js dashboard UI
- **`tests/`** — 27 Jest tests covering SSRF, variable extraction, validation, encryption, snapshots
- **`.github/workflows/`** — GitHub Actions CI/CD pipeline
