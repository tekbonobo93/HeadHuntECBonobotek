# Plan Preproduccion Dokploy

Fecha de elaboracion: 23 de julio de 2026

## Objetivo

Preparar TalentoMatch IA para operar en un servidor productivo sobre Dokploy con menor riesgo operativo, mejor seguridad y una ruta clara de estabilizacion.

## Estado actual resumido

- Ya existe despliegue con `Dockerfile` y `docker-compose.yml`.
- La aplicacion usa PostgreSQL real.
- Existe autenticacion con sesiones, verificacion de correo, recuperacion de contrasena y roles.
- Hay `healthcheck`, pero no existe observabilidad completa ni pipeline de pruebas.
- El backend sigue muy concentrado en `server.ts`.

## Fase 0: Cierre de brechas criticas

Objetivo: evitar publicar una app funcional pero insegura o mal configurada.

### Tareas

- [x] Documentar el plan de endurecimiento previo a produccion.
- [x] Integrar soporte SMTP real en codigo y configuracion de Dokploy para verificacion de correo y recuperacion de contrasena.
- [x] Dejar el bootstrap de admin controlado por `INITIAL_ADMIN_EMAIL` en produccion.
- [x] Validar configuracion critica al arranque:
  - `APP_URL`
  - `INITIAL_ADMIN_EMAIL`
  - `TRUST_PROXY=true`
- [x] Dejar `AUTH_PREVIEW_LINKS` documentado como modo temporal de staging/dev, no como postura objetivo de produccion.
- [x] Mover el rate limiting de auth a Redis o al proxy de entrada mediante configuracion explicita.
- [x] Definir politica de secretos en Dokploy:
  - `GEMINI_API_KEY`
  - `DATABASE_URL`
  - `APP_URL`
  - credenciales SMTP
  - `INITIAL_ADMIN_EMAIL`

### Riesgo que reduce

- Evita admins accidentales.
- Reduce despliegues mal configurados.
- Evita depender de enlaces de preview como mecanismo permanente de recuperacion.

## Fase 1: Estabilizacion del backend

Objetivo: bajar riesgo de regresiones y mejorar mantenibilidad.

### Tareas

- [x] Separar infraestructura transversal del backend en modulos:
  - `auth`
  - `state`
  - `middleware`
  - `config`
- [x] Separar completamente los flujos legacy de IA en modulos:
  - `jobs`
  - `interview`
- [x] Extraer validaciones de request con `zod` o equivalente.
- [x] Estandarizar payloads de error para los routers nuevos.
- [x] Consolidar middlewares de auth, roles y manejo de errores para auth/state.

### Estado

Fase 1 completada.

## Fase 2: Base de datos y persistencia

Objetivo: volver la capa de datos versionable y operable.

### Tareas

- [x] Introducir migraciones formales.
- [x] Versionar esquema y bootstrap inicial.
- [x] Revisar indices de tablas de auth y sesiones.
- [x] Definir backup y restore de PostgreSQL en Dokploy.
- [x] Probar restauracion real desde backup.

### Estado

Fase 2 completada.

Validacion operativa realizada el 23 de julio de 2026:

- migraciones ejecutadas correctamente desde la imagen runtime con `npm run db:migrate:prod`
- dump real generado con `pg_dump`
- restore real ejecutado con `pg_restore` sobre una base temporal `headhunt_restore_check`
- datos y `schema_migrations` verificados tras la restauracion

## Fase 3: Seguridad de aplicacion

Objetivo: endurecer la app para exposicion publica.

### Tareas

- [x] Agregar `helmet` o endurecimiento equivalente.
- [x] Revisar CSRF para endpoints con cookie de sesion.
- [x] Definir politica de CORS si hay frontend separado.
- [x] Auditar eventos sensibles:
  - login
  - logout
  - reset de contrasena
  - verificacion
  - acciones admin
- [x] Endurecer limites de payload y timeouts por endpoint.

### Estado

Fase 3 completada el 23 de julio de 2026.

Validacion funcional y tecnica:

- headers de seguridad equivalentes a `helmet` aplicados desde middleware propio
- proteccion CSRF activa para mutaciones `/api/*` con validacion de origen y doble submit cookie
- politica CORS explicita mediante `CORS_ALLOWED_ORIGINS`
- auditoria de seguridad agregada para auth, rate limiting y acciones admin
- limites de payload por router y timeouts por endpoint
- `npm run lint`
- `npm run build`

## Fase 4: Observabilidad y operacion

Objetivo: detectar y responder incidentes con rapidez.

### Tareas

- [x] Pasar a logs estructurados JSON.
- [x] Agregar `request_id`.
- [x] Medir:
  - latencia
  - tasa de error
  - disponibilidad DB
  - fallos Gemini
- [x] Configurar alertas basicas.
- [x] Documentar runbooks:
  - deploy
  - rollback
  - rotacion de secretos
  - falla de DB

### Estado

Fase 4 completada el 23 de julio de 2026.

Validacion funcional y tecnica:

- logs JSON de arranque, requests, errores y alertas
- `request_id` propagado en `X-Request-Id`
- heartbeat de PostgreSQL y readiness real en `/health`
- snapshot admin de observabilidad en `/api/admin/observability`
- alertas basicas para DB, Gemini y error rate
- runbooks operativos en `OPERATIONS_RUNBOOKS.md`

## Fase 5: Calidad y pipeline de release

Objetivo: reducir regresiones antes de deploy.

### Tareas

- [x] Agregar tests unitarios.
- [x] Agregar tests de integracion para auth y state.
- [x] Crear smoke tests post deploy.
- [x] Montar CI con:
  - lint
  - build
  - tests
  - auditoria de dependencias

### Estado

Fase 5 completada el 23 de julio de 2026.

Incluye:

- `tests/unit/persistedState.test.ts`
- `tests/integration/auth-state.test.ts`
- `scripts/smoke-postdeploy.ts`
- `.github/workflows/ci.yml`
- scripts `npm test`, `npm run test:unit`, `npm run test:integration`, `npm run smoke:postdeploy`, `npm run audit:deps`

Validacion realizada:

- `npm run lint`
- `npm run build`
- `npm run test:unit`
- `npm run test:integration` con PostgreSQL real temporal en Docker
- `npm run audit:deps`

## Fase 6: Hardening de contenedor y Dokploy

Objetivo: reducir superficie de ataque y mejorar operacion.

### Tareas

- [x] Ejecutar contenedor con usuario no root.
- [x] Reducir imagen runtime.
- [x] Revisar `.dockerignore`.
- [x] Definir limites de CPU y memoria en Dokploy.
- [x] Formalizar estrategia de rollback.
- [x] Separar staging y produccion con recursos y secretos distintos.

### Estado

Fase 6 implementada el 23 de julio de 2026.

Incluye:

- `Dockerfile` endurecido con runtime non-root
- `docker-compose.yml` con opciones de seguridad y limites locales de referencia
- `.dockerignore` revisado para reducir contexto de build
- `.env.staging.example`
- `.env.production.example`
- `ROLLBACK_STRATEGY.md`
- `FINAL_RELEASE_CHECKLIST.md`
- actualizacion de `DOKPLOY.md` y `OPERATIONS_RUNBOOKS.md`

## Orden recomendado

1. Fase 0
2. Fase 2
3. Fase 3
4. Fase 4
5. Fase 1
6. Fase 5
7. Fase 6

## Ejecucion actual

Cambios completados en esta iteracion:

- documentacion del plan
- endurecimiento de configuracion de produccion
- bootstrap de admin controlado en produccion
- soporte SMTP para correos de autenticacion
- rate limiting configurable con Redis o proxy
- politica de secretos documentada para Dokploy
- modularizacion de auth, state, config y middleware compartido
- validacion explicita de requests con zod en los routers nuevos
- extraccion estricta de la logica y handlers de IA a modulos dedicados
- migraciones versionadas para PostgreSQL
- scripts y runbook de backup y restore para Dokploy
- hardening de seguridad de aplicacion con CSRF, CORS, auditoria y timeouts
