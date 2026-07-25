# Runbooks Operativos

Fecha de actualizacion: 23 de julio de 2026

## Observabilidad disponible

- `GET /health/live`
  - valida que el proceso HTTP siga levantado
- `GET /health`
  - valida proceso + conectividad real con PostgreSQL
  - responde `503` si la base esta degradada o no responde
- `GET /api/admin/observability`
  - requiere sesion autenticada con rol `admin`
  - devuelve snapshot JSON con:
    - `uptimeSeconds`
    - `requests.windowErrorRate`
    - `requests.routes`
    - `database.status`
    - `database.latencyMs`
    - `gemini.windowFailures`
    - `alerts.*`

## Alertas basicas

Alertas emitidas como logs JSON:

- `alert.db_unavailable`
  - se dispara tras 3 heartbeats fallidos consecutivos contra PostgreSQL
- `alert.db_unavailable_recovered`
  - se registra cuando PostgreSQL vuelve a responder
- `alert.gemini_failures`
  - se dispara con 5 fallos Gemini en una ventana de 10 minutos
- `alert.gemini_failures_recovered`
  - se registra cuando el volumen de fallos baja del umbral
- `alert.high_error_rate`
  - se dispara si la app acumula al menos 20 requests en 5 minutos y el error rate supera 20%
- `alert.high_error_rate_recovered`
  - se registra cuando el error rate vuelve a rango

## Deploy

1. Confirmar variables de entorno y secretos en Dokploy.
2. Ejecutar build de imagen.
3. Ejecutar migraciones:
   - dentro del contenedor runtime: `npm run db:migrate:prod`
4. Desplegar la nueva version.
5. Verificar:
   - `GET /health/live`
   - `GET /health`
   - login real
   - `GET /api/admin/observability`
6. Revisar logs JSON:
   - `server.started`
   - `http.request.completed`
   - ausencia de `alert.*`

## Rollback

1. Identificar la ultima imagen estable en Dokploy.
2. Revertir deployment a esa imagen.
3. Validar:
   - `GET /health/live`
   - `GET /health`
   - login
4. Si el problema vino de una migracion:
   - detener rollout
   - evaluar restore usando `POSTGRES_OPERATIONS.md`
   - no improvisar `ALTER TABLE` manual en produccion sin snapshot previo

Referencia ampliada:

- `ROLLBACK_STRATEGY.md`

## Rotacion de secretos

Aplicar a:

- `GEMINI_API_KEY`
- `DATABASE_URL`
- `SMTP_PASS`
- `REDIS_URL`

Pasos:

1. Crear secreto nuevo en el proveedor.
2. Cargar el nuevo valor en Dokploy.
3. Reiniciar el deployment.
4. Validar `GET /health`.
5. Verificar login, envio SMTP y uso de Gemini.
6. Revocar el secreto antiguo.

## Falla de base de datos

Sintomas esperados:

- `/health` devuelve `503`
- logs `db.health.failed`
- posible `alert.db_unavailable`

Respuesta:

1. Confirmar si falla conectividad, credenciales o servicio PostgreSQL.
2. Revisar disponibilidad del servicio DB en Dokploy.
3. Verificar que `DATABASE_URL` siga vigente.
4. Si hubo corrupcion o perdida:
   - seguir `POSTGRES_OPERATIONS.md`
   - restaurar primero sobre base temporal
   - validar `schema_migrations`
5. Una vez recuperado:
   - confirmar `alert.db_unavailable_recovered`
   - revisar `GET /api/admin/observability`

## Interpretacion rapida del snapshot

- `database.status=healthy`
  - la app esta llegando a PostgreSQL
- `requests.windowErrorRate > 0.2`
  - revisar rutas con mayor `errors`
- `gemini.windowFailures >= 5`
  - revisar cuota, conectividad o degradacion del proveedor
- `requests.routes[].maxDurationMs` alto
  - revisar endpoints de IA o payloads grandes
