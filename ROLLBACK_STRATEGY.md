# Rollback Strategy

Fecha de actualizacion: 23 de julio de 2026

## Objetivo

Definir una estrategia predecible de rollback para Dokploy sin improvisacion operativa.

## Principios

- Cada release debe quedar asociada a una imagen inmutable o commit identificable.
- Ningun rollback de aplicacion debe ejecutarse sin revisar compatibilidad de migraciones.
- Si hubo cambios de esquema no retrocompatibles, el rollback de app y el rollback de base deben tratarse como operaciones separadas.

## Tipos de rollback

### 1. Rollback de aplicacion

Usar cuando:

- falla una ruta HTTP
- se degradan metricas
- la app no inicia
- hay regresion funcional sin corrupcion de datos

Pasos:

1. Identificar la ultima imagen estable en Dokploy.
2. Re-deploy de esa imagen exacta.
3. Validar:
   - `GET /health/live`
   - `GET /health`
   - login
   - `GET /api/admin/observability`
4. Confirmar que no aparezcan `alert.*` nuevas.

### 2. Rollback de base de datos

Usar cuando:

- una migracion dano datos
- una migracion dejo a la app inutilizable
- hay corrupcion o borrado accidental

Pasos:

1. Congelar deploys.
2. Tomar snapshot adicional si la base aun responde.
3. Restaurar primero sobre base temporal de verificacion.
4. Validar:
   - `schema_migrations`
   - conteos criticos
   - login
   - `/health`
5. Solo despues promover el restore a la base objetivo.

Referencia operativa:

- `POSTGRES_OPERATIONS.md`

## Compatibilidad esperada por release

- Preferir cambios de esquema aditivos.
- Evitar eliminar columnas o cambiar contratos de forma destructiva en una sola release.
- Cuando un release introduzca una migracion potencialmente no reversible:
  - documentar el riesgo en el PR
  - generar backup previo obligatorio
  - planear ventana de despliegue controlada

## Politica staging vs produccion

- staging y produccion deben usar:
  - bases de datos distintas
  - Redis distinto
  - secretos SMTP distintos
  - `APP_URL` distinto
  - admins iniciales distintos
- nunca compartir `DATABASE_URL` ni `REDIS_URL` entre entornos

## Checklist previo a rollback

- identificar alcance: app, DB o ambos
- validar ultima imagen estable
- validar ultimo backup util
- revisar `OPERATIONS_RUNBOOKS.md`
- comunicar ventana y criterio de exito
