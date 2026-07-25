import { closeDatabasePool, initializeDatabase } from "../db";

async function main() {
  await initializeDatabase();
  await closeDatabasePool();
  console.log("Database migrations applied successfully.");
}

main().catch(async (error) => {
  console.error("Database migration failed.", error);
  await closeDatabasePool().catch(() => undefined);
  process.exitCode = 1;
});
