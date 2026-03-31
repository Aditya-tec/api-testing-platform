# Distributed API Workflow Execution Platform 

A full-stack platform for **defining, running, and monitoring API test collections**—built to replace ad-hoc Postman runs with **repeatable execution, queued workers, results history, and metrics**.

## What this app is for (use cases)

- **Regression checks for APIs**: run the same collection repeatedly and compare outcomes over time.
- **Smoke tests after deployments**: trigger a job run and review pass/fail by request.
- **Multi-step API workflows**: extract values from one response (e.g., `userId`, `token`) and inject them into later requests.
- **Team visibility & auditability**: keep a persistent execution history with per-request results and an event trail.
- **Performance awareness**: track latency trends and identify slow requests across many runs.

## Core concepts

- **Collection**: a saved definition of API requests (method, URL, headers, body, timeout) with an execution mode (sequential or parallel).
- **Job**: one execution of a collection. Jobs store a **snapshot** of the collection at run time so reruns stay deterministic even if the collection later changes.
- **Request Result**: one record per request within a job (status, HTTP status, latency, response snippet, retries, error message).
- **Event Log**: an append-only timeline for job execution (job/request lifecycle, retries, variable extraction events).
- **Auth Profile**: reusable credential storage (bearer token or API key) that can be linked to collections; secrets are **encrypted at rest** and never returned by the API.

## Key features

- **Queued execution with workers**: jobs are enqueued and processed by a separate worker process (with configurable concurrency).
- **Deterministic reruns**: rerun a job using the original request/auth snapshots.
- **Sequential “workflow” mode**: supports `{{variable}}` placeholders and response-to-variable extraction (dot-path rules) so later requests can depend on earlier outputs.
- **Retries with exponential backoff**: request execution retries transient failures and records retry events.
- **Safety controls for outbound requests**: SSRF protection blocks private/internal network targets and unsafe protocols (including DNS-rebinding protection).
- **Credential security**: auth profile tokens are AES-encrypted in MongoDB; API responses redact secrets.
- **Observability endpoints**: global metrics and per-collection metrics via MongoDB aggregation pipelines.
- **OpenAPI documentation**: comprehensive Swagger/OpenAPI (v3) specification generated from route annotations.

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
- **Encrypted credentials** (AES via `crypto-js`)
- **Graceful shutdown** for server and worker processes

## API surface (resources)

- **Health**: liveness checks
- **Collections**: CRUD + collection job history
- **Jobs**: create/execute, list/filter, fetch details, rerun, results, logs
- **Metrics**: global snapshot + per-collection rollups
- **Auth Profiles**: CRUD with safe responses (no credential disclosure)

## Data model (at a glance)

- **`Collection`**: request definitions + execution mode + optional linked auth profile
- **`Job`**: snapshot of requests/auth + status + extracted variables + timestamps
- **`RequestResult`**: per-request status/latency/HTTP outcome/response snippet
- **`Log`**: structured event trail for auditing and debugging
- **`AuthProfile`**: reusable credential metadata + encrypted token at rest

## Repository layout

- **`src/`**: Express API, controllers, models, services, worker/queue logic
- **`frontend/`**: Next.js dashboard UI
- **`SWAGGER_SETUP.md`**: OpenAPI/Swagger documentation notes

