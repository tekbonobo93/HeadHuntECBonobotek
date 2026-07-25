import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Pool } from "pg";

interface MigrationFile {
  checksum: string;
  fileName: string;
  sql: string;
  version: string;
}

const MIGRATIONS_DIRECTORY = path.resolve(process.cwd(), "db", "migrations");

async function ensureMigrationTable(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function loadMigrationFiles(): Promise<MigrationFile[]> {
  const entries = await fs.readdir(MIGRATIONS_DIRECTORY, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    files.map(async (fileName) => {
      const match = fileName.match(/^(\d+)_/);
      if (!match) {
        throw new Error(`Invalid migration file name "${fileName}". Expected numeric prefix like 001_name.sql.`);
      }

      const fullPath = path.join(MIGRATIONS_DIRECTORY, fileName);
      const sql = await fs.readFile(fullPath, "utf8");
      return {
        version: match[1],
        fileName,
        sql,
        checksum: createHash("sha256").update(sql).digest("hex"),
      };
    }),
  );
}

export async function runDatabaseMigrations(pool: Pool) {
  await ensureMigrationTable(pool);

  const migrationFiles = await loadMigrationFiles();
  const appliedResult = await pool.query<{ version: string; checksum: string }>(
    "SELECT version, checksum FROM schema_migrations",
  );
  const appliedByVersion = new Map(appliedResult.rows.map((row) => [row.version, row.checksum]));

  for (const migration of migrationFiles) {
    const appliedChecksum = appliedByVersion.get(migration.version);
    if (appliedChecksum) {
      if (appliedChecksum !== migration.checksum) {
        throw new Error(
          `Migration checksum mismatch for version ${migration.version}. Expected ${appliedChecksum} but found ${migration.checksum}.`,
        );
      }
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(migration.sql);
      await client.query(
        `
          INSERT INTO schema_migrations (version, file_name, checksum)
          VALUES ($1, $2, $3)
        `,
        [migration.version, migration.fileName, migration.checksum],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
