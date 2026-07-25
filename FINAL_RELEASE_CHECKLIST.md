# Final Release Checklist

Fecha de actualizacion: 23 de julio de 2026

## Checklist previo a produccion en Dokploy

### Infraestructura

- [ ] proyecto `staging` separado de `production`
- [ ] PostgreSQL separado por entorno
- [ ] Redis separado por entorno
- [ ] secretos SMTP separados por entorno
- [ ] `APP_URL` correcto por entorno
- [ ] `INITIAL_ADMIN_EMAIL` correcto por entorno

### Build y release

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run test`
- [ ] `npm run audit:deps`
- [ ] imagen Docker construida correctamente
- [ ] version o imagen objetivo identificada para rollback

### Base de datos

- [ ] backup reciente disponible
- [ ] `npm run db:migrate:prod` ejecutado o validado en despliegue
- [ ] `schema_migrations` consistente

### Seguridad

- [ ] `AUTH_PREVIEW_LINKS=false`
- [ ] `AUTH_RATE_LIMIT_STRATEGY=redis` o `proxy`
- [ ] `TRUST_PROXY=true`
- [ ] `CORS_ALLOWED_ORIGINS` validado
- [ ] SMTP real funcionando

### Observabilidad

- [ ] `GET /health/live` responde `200`
- [ ] `GET /health` responde `200`
- [ ] `GET /api/auth/session` responde correctamente
- [ ] snapshot admin `/api/admin/observability` accesible
- [ ] sin `alert.db_unavailable`
- [ ] sin `alert.gemini_failures`
- [ ] sin `alert.high_error_rate`

### Smoke funcional

- [ ] login
- [ ] verificacion de correo
- [ ] recuperacion de contrasena
- [ ] lectura y escritura de `/api/state`
- [ ] acceso admin a `/api/admin/users`
- [ ] smoke post deploy con `SMOKE_BASE_URL=... npm run smoke:postdeploy`

## Criterio de salida

Solo promover a produccion cuando todos los checks anteriores esten en verde o exista aprobacion explicita del riesgo pendiente.
