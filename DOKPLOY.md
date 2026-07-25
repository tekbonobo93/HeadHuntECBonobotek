# Dokploy

## Deployment mode

Recommended files for separate Dokploy services:

- `docker-compose.frontend.yml`
- `docker-compose.backend.yml`
- `docker-compose.postgres.yml`
- `docker-compose.redis.yml`

Use `docker-compose.yml` only as the aggregated local stack for development and validation.

## Required environment variables

- Frontend:
  - `BACKEND_UPSTREAM` pointing to the backend internal URL or domain in Dokploy
- Backend:
- `GEMINI_API_KEY`
- `DATABASE_URL`
- `APP_URL`
- `INITIAL_ADMIN_EMAIL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `AUTH_RATE_LIMIT_STRATEGY`

## Optional environment variables

- Frontend:
- `PORT=3000`
- `APP_PORT=3100`
- `BACKEND_UPSTREAM=http://backend:3000`
- Backend:
- `PORT=3000`
- `HOST=0.0.0.0`
- `TRUST_PROXY=true`
- `NODE_ENV=production`
- `SERVE_FRONTEND=false`
- `PGSSL=false`
- `CORS_ALLOWED_ORIGINS=`
- `APP_STATE_USER_ID=default`
- `REDIS_URL=redis://redis:6379`
- `SMTP_SECURE=false`
- `AUTH_PREVIEW_LINKS=false`

## Recommended Dokploy settings

- Frontend:
  - Compose file: `docker-compose.frontend.yml`
  - Service name: `frontend`
  - Container port: `80`
  - Public port / domain: expose this service to users
  - Required env: `BACKEND_UPSTREAM=http://<backend-host>:3000` or the internal Dokploy URL of the backend
- Backend:
  - Compose file: `docker-compose.backend.yml`
  - Service name: `backend`
  - Container port: `3000`
  - Health check path: `/health`
  - Keep this service private when frontend proxies `/api`
  - Do not publish a host port for this service in Dokploy
- PostgreSQL:
  - Compose file: `docker-compose.postgres.yml`
  - Service name: `postgres`
  - Expose only to trusted internal consumers when possible
- Redis:
  - Compose file: `docker-compose.redis.yml`
  - Service name: `redis`
  - Expose only to trusted internal consumers when possible
- Restart policy: `unless-stopped`
- Runtime user: non-root
- Read-only filesystem: enabled when your Dokploy template supports it
- Resource limits:
  - frontend: `0.5 CPU`, `256 MB`
  - backend: `1 CPU`, `768 MB`
  - postgres: `1 CPU`, `768 MB`
  - redis: `0.5 CPU`, `256 MB`
- Database:
  - deploy `docker-compose.postgres.yml` or use a managed PostgreSQL service
  - point `DATABASE_URL` in backend to that PostgreSQL instance
- Cache / rate limit:
  - deploy `docker-compose.redis.yml` or use a managed Redis service
  - point `REDIS_URL` in backend to that Redis instance
- CORS:
  - if frontend proxies `/api` to backend, leave `CORS_ALLOWED_ORIGINS` empty
  - if browsers call backend directly from a different frontend origin, set `CORS_ALLOWED_ORIGINS` to the exact allowed origins, comma-separated, without wildcards

## Environment separation

- Use independent Dokploy projects or applications for `staging` and `production`.
- Use different values for:
  - `APP_URL`
  - `DATABASE_URL`
  - `REDIS_URL`
  - `INITIAL_ADMIN_EMAIL`
  - SMTP credentials
  - `GEMINI_API_KEY`
- Base templates:
  - staging: `.env.staging.example`
  - production: `.env.production.example`

## Secret policy

- Treat these as Dokploy secrets and never commit real values:
  - `GEMINI_API_KEY`
  - `DATABASE_URL`
  - `APP_URL`
  - `INITIAL_ADMIN_EMAIL`
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `SMTP_FROM`
  - `REDIS_URL`
- Rotate `SMTP_PASS`, `GEMINI_API_KEY` and `DATABASE_URL` credentials on incident or operator change.
- Keep production and staging with separate SMTP, Redis and PostgreSQL credentials.
- Set `AUTH_PREVIEW_LINKS=false` in production. Enable it only temporarily for controlled staging or emergency rollout.

## Notes

- The frontend and backend are now deployed as separate services.
- The frontend serves the Vite build through Nginx and proxies `/api`, `/health`, and `/health/live` to the backend.
- For Dokploy split deployments, each service can now point to its own compose file instead of sharing one monolithic stack.
- The backend no longer needs to serve the SPA unless `SERVE_FRONTEND=true` is set explicitly.
- `server.ts` now reads `PORT` and `HOST` from the environment, which matches Dokploy's runtime model.
- The backend container builds and runs on Node 22 with `npm ci`; the frontend container serves static assets with Nginx.
- Application state is now persisted in PostgreSQL through `DATABASE_URL`.
- PostgreSQL schema changes are now versioned in `db/migrations/`.
- Local/manual migration command in the repo: `npm run db:migrate`.
- Manual migration command inside the production container: `npm run db:migrate:prod`.
- Backup and restore operational steps are documented in `POSTGRES_OPERATIONS.md`.
- Operational runbooks and alert thresholds are documented in `OPERATIONS_RUNBOOKS.md`.
- CI pipeline is defined in `.github/workflows/ci.yml`.
- Rollback strategy is formalized in `ROLLBACK_STRATEGY.md`.
- If Dokploy terminates TLS at the proxy, set `TRUST_PROXY=true`.
- Mutating `/api/*` requests now require trusted `Origin`/`Referer` and a browser CSRF header backed by the `talentomatch_csrf` cookie.
- In production, the app validates `APP_URL`, `INITIAL_ADMIN_EMAIL`, SMTP settings and the selected auth rate-limit strategy at startup.
- In production, admin bootstrap is controlled through `INITIAL_ADMIN_EMAIL`; do not rely on first-user promotion.
- For distributed auth rate limiting, prefer `AUTH_RATE_LIMIT_STRATEGY=redis`. If Dokploy enforces limits at the proxy, you may switch to `AUTH_RATE_LIMIT_STRATEGY=proxy`.
- Observability:
  - `GET /health/live` checks process liveness
  - `GET /health` checks process + PostgreSQL readiness
  - `GET /api/admin/observability` exposes admin-only JSON metrics snapshot
- Release quality:
  - CI runs lint, build, unit tests, integration tests and `npm audit`
- post-deploy smoke can be executed with `SMOKE_BASE_URL=https://tu-app npm run smoke:postdeploy`
- local Docker validation:
  - `npm run docker:up`
  - `npm run test:docker`
  - `npm run smoke:docker`
  - `npm run validate:docker`
- Container hardening:
  - runtime now runs as non-root user `node`
  - app container drops Linux capabilities and enables `no-new-privileges`
  - app container is mounted read-only with `tmpfs` for `/tmp`
