# PostgreSQL Operations

Fecha de actualizacion: 23 de julio de 2026

## Migraciones

- Ejecutar migraciones manualmente:
  - `npm run db:migrate`
- Ejecutar migraciones dentro del contenedor runtime:
  - `npm run db:migrate:prod`
- El arranque del backend tambien ejecuta migraciones antes de abrir el puerto HTTP.
- El historial queda en `schema_migrations`.

## Backup en Dokploy

Requisitos en el contenedor o job:

- `DATABASE_URL`
- binarios `pg_dump`, `pg_restore` y `psql`

Comando recomendado:

```sh
DATABASE_URL="postgresql://..." \
BACKUP_DIR="/var/backups/talentomatch" \
./scripts/postgres-backup.sh
```

Resultado:

- genera un dump en formato custom de PostgreSQL
- permite restauracion con `pg_restore`

## Restore en entorno de verificacion

Nunca restaurar primero sobre la base productiva. Usar una base temporal o staging.

```sh
TARGET_DATABASE_URL="postgresql://..." \
BACKUP_FILE="/var/backups/talentomatch/talentomatch-20260723T000000Z.dump" \
./scripts/postgres-restore.sh
```

Validacion minima tras restore:

- la tabla `schema_migrations` existe y contiene las versiones esperadas
- la consulta `SELECT COUNT(*) FROM users;` responde
- el endpoint `/health` levanta si la app se conecta a esa base

## Prueba operativa recomendada en Dokploy

1. Crear una base temporal `headhunt_restore_check`.
2. Ejecutar `./scripts/postgres-backup.sh` contra la base activa.
3. Ejecutar `./scripts/postgres-restore.sh` apuntando a `headhunt_restore_check`.
4. Levantar temporalmente la app contra `TARGET_DATABASE_URL=headhunt_restore_check`.
5. Validar login, lectura de estado y `/health`.
6. Eliminar la base temporal al cerrar la verificacion.

## Politica recomendada

- Backup diario automatico y retencion minima de 7 a 14 dias.
- Un restore de verificacion al menos una vez por sprint o antes de cambios grandes de esquema.
- Guardar dumps fuera del contenedor principal.
