import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { Pool } from "pg";
import { AuthUser, PersistedAppState } from "./src/types";
import { createDefaultPersistedState } from "./src/utils/persistedState";
import { runDatabaseMigrations } from "./server/db/migrationRunner";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required to start the server with PostgreSQL persistence.");
}

const sslEnabled = process.env.PGSSL === "true";
const SESSION_TTL_DAYS = 30;
const EMAIL_VERIFICATION_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_MINUTES = 60;
const LOGIN_LOCK_THRESHOLD = 5;
const LOGIN_LOCK_MINUTES = 15;
const INITIAL_ADMIN_EMAIL = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase() || null;

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
});

type UserRole = AuthUser["role"];
type AuthTokenType = "email_verification" | "password_reset";

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  password_salt: string;
  role: UserRole;
  email_verified_at: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  created_at?: string;
}

interface BasicUserRow {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  email_verified_at: string | null;
}

interface AdminUserListRow extends BasicUserRow {
  created_at: string;
  failed_login_attempts: number;
  locked_until: string | null;
  active_sessions: string;
}

export type AuthenticationResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: "invalid_credentials" | "email_not_verified" | "locked"; user?: AuthUser; lockedUntil?: string | null };

function deepMerge<T>(base: T, patch: Partial<T>): T {
  if (Array.isArray(base) || Array.isArray(patch) || typeof base !== "object" || base === null || typeof patch !== "object" || patch === null) {
    return (patch as T) ?? base;
  }

  const merged: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    const currentValue = merged[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      currentValue &&
      typeof currentValue === "object" &&
      !Array.isArray(currentValue)
    ) {
      merged[key] = deepMerge(currentValue as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      merged[key] = value;
    }
  }

  return merged as T;
}

function normalizeState(raw: unknown): PersistedAppState {
  const defaults = createDefaultPersistedState();
  if (!raw || typeof raw !== "object") {
    return defaults;
  }
  return deepMerge(defaults, raw as Partial<PersistedAppState>);
}

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
}

function createPasswordRecord(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, expectedHash: string) {
  const candidateHash = hashPassword(password, salt);
  return timingSafeEqual(Buffer.from(candidateHash, "hex"), Buffer.from(expectedHash, "hex"));
}

function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function toAuthUser(row: BasicUserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    emailVerified: Boolean(row.email_verified_at),
  };
}

function isUserLocked(row: UserRow) {
  return Boolean(row.locked_until && new Date(row.locked_until).getTime() > Date.now());
}

async function determineRoleForNewUser(normalizedEmail: string): Promise<UserRole> {
  if (INITIAL_ADMIN_EMAIL && normalizedEmail === INITIAL_ADMIN_EMAIL) {
    return "admin";
  }

  if (process.env.NODE_ENV === "production") {
    return "user";
  }

  const result = await pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM users");
  return Number(result.rows[0]?.count || "0") === 0 ? "admin" : "user";
}

async function createOneTimeToken(userId: string, type: AuthTokenType, ttlAmount: number, ttlUnit: "hours" | "minutes") {
  const token = randomBytes(48).toString("hex");
  const tokenHash = hashOpaqueToken(token);

  await pool.query("DELETE FROM user_auth_tokens WHERE user_id = $1 AND type = $2", [userId, type]);
  await pool.query(
    `
      INSERT INTO user_auth_tokens (token_hash, user_id, type, expires_at)
      VALUES ($1, $2, $3, NOW() + ($4 || ' ${ttlUnit}')::interval)
    `,
    [tokenHash, userId, type, String(ttlAmount)],
  );

  return token;
}

export async function initializeDatabase() {
  await runDatabaseMigrations(pool);
  await pool.query("DELETE FROM user_sessions WHERE expires_at <= NOW()");
  await pool.query("DELETE FROM user_auth_tokens WHERE expires_at <= NOW() OR consumed_at IS NOT NULL");
}

export async function closeDatabasePool() {
  await pool.end();
}

export async function checkDatabaseHealth() {
  const startedAt = process.hrtime.bigint();

  try {
    await pool.query("SELECT 1");
    const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    return {
      ok: true,
      latencyMs: Number(latencyMs.toFixed(2)),
    };
  } catch (error) {
    const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    return {
      ok: false,
      latencyMs: Number(latencyMs.toFixed(2)),
      error,
    };
  }
}

async function ensureUserState(userId: string) {
  const defaults = createDefaultPersistedState();
  await pool.query(
    `
      INSERT INTO app_user_state (user_id, state)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (user_id) DO NOTHING
    `,
    [userId, JSON.stringify(defaults)],
  );
}

async function findUserByEmail(email: string): Promise<UserRow | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await pool.query<UserRow>(
    `
      SELECT
        id,
        email,
        name,
        password_hash,
        password_salt,
        role,
        email_verified_at,
        failed_login_attempts,
        locked_until,
        created_at
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [normalizedEmail],
  );

  return result.rowCount ? result.rows[0] : null;
}

async function findUserById(userId: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    `
      SELECT
        id,
        email,
        name,
        password_hash,
        password_salt,
        role,
        email_verified_at,
        failed_login_attempts,
        locked_until,
        created_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  );

  return result.rowCount ? result.rows[0] : null;
}

async function clearFailedLoginState(userId: string) {
  await pool.query(
    `
      UPDATE users
      SET failed_login_attempts = 0,
          locked_until = NULL,
          updated_at = NOW()
      WHERE id = $1
    `,
    [userId],
  );
}

async function recordFailedLoginAttempt(userId: string) {
  const result = await pool.query<{ locked_until: string | null }>(
    `
      UPDATE users
      SET failed_login_attempts = failed_login_attempts + 1,
          locked_until = CASE
            WHEN failed_login_attempts + 1 >= $2 THEN NOW() + ($3 || ' minutes')::interval
            ELSE locked_until
          END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING locked_until
    `,
    [userId, LOGIN_LOCK_THRESHOLD, String(LOGIN_LOCK_MINUTES)],
  );

  return result.rows[0]?.locked_until || null;
}

export async function createUser(name: string, email: string, password: string): Promise<AuthUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim();
  const { salt, hash } = createPasswordRecord(password);
  const id = randomUUID();
  const role = await determineRoleForNewUser(normalizedEmail);

  const result = await pool.query<BasicUserRow>(
    `
      INSERT INTO users (id, email, name, password_hash, password_salt, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, name, role, email_verified_at
    `,
    [id, normalizedEmail, normalizedName, hash, salt, role],
  );

  await ensureUserState(id);
  return toAuthUser(result.rows[0]);
}

export async function authenticateUser(email: string, password: string): Promise<AuthenticationResult> {
  const user = await findUserByEmail(email);
  if (!user) {
    return { ok: false, reason: "invalid_credentials" };
  }

  if (isUserLocked(user)) {
    return { ok: false, reason: "locked", lockedUntil: user.locked_until };
  }

  const isValid = verifyPassword(password, user.password_salt, user.password_hash);
  if (!isValid) {
    const lockedUntil = await recordFailedLoginAttempt(user.id);
    return { ok: false, reason: lockedUntil ? "locked" : "invalid_credentials", lockedUntil };
  }

  if (!user.email_verified_at) {
    return { ok: false, reason: "email_not_verified", user: toAuthUser(user) };
  }

  await clearFailedLoginState(user.id);
  return { ok: true, user: toAuthUser(user) };
}

export async function createEmailVerificationToken(userId: string) {
  return createOneTimeToken(userId, "email_verification", EMAIL_VERIFICATION_TTL_HOURS, "hours");
}

export async function resendEmailVerificationToken(email: string) {
  const user = await findUserByEmail(email);
  if (!user || user.email_verified_at) {
    return null;
  }

  const token = await createEmailVerificationToken(user.id);
  return {
    token,
    user: toAuthUser(user),
  };
}

export async function verifyEmailByToken(token: string): Promise<AuthUser | null> {
  const tokenHash = hashOpaqueToken(token);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const lookup = await client.query<{ user_id: string }>(
      `
        SELECT user_id
        FROM user_auth_tokens
        WHERE token_hash = $1
          AND type = 'email_verification'
          AND consumed_at IS NULL
          AND expires_at > NOW()
        LIMIT 1
        FOR UPDATE
      `,
      [tokenHash],
    );

    if (!lookup.rowCount) {
      await client.query("ROLLBACK");
      return null;
    }

    const userId = lookup.rows[0].user_id;
    const result = await client.query<BasicUserRow>(
      `
        UPDATE users
        SET email_verified_at = COALESCE(email_verified_at, NOW()),
            failed_login_attempts = 0,
            locked_until = NULL,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, name, role, email_verified_at
      `,
      [userId],
    );

    await client.query(
      `
        UPDATE user_auth_tokens
        SET consumed_at = NOW()
        WHERE token_hash = $1
      `,
      [tokenHash],
    );
    await client.query("COMMIT");
    return result.rowCount ? toAuthUser(result.rows[0]) : null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createPasswordResetToken(email: string) {
  const user = await findUserByEmail(email);
  if (!user) {
    return null;
  }

  const token = await createOneTimeToken(user.id, "password_reset", PASSWORD_RESET_TTL_MINUTES, "minutes");
  return {
    token,
    user: toAuthUser(user),
  };
}

export async function resetPasswordWithToken(token: string, password: string): Promise<AuthUser | null> {
  const tokenHash = hashOpaqueToken(token);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const lookup = await client.query<{ user_id: string }>(
      `
        SELECT user_id
        FROM user_auth_tokens
        WHERE token_hash = $1
          AND type = 'password_reset'
          AND consumed_at IS NULL
          AND expires_at > NOW()
        LIMIT 1
        FOR UPDATE
      `,
      [tokenHash],
    );

    if (!lookup.rowCount) {
      await client.query("ROLLBACK");
      return null;
    }

    const userId = lookup.rows[0].user_id;
    const { salt, hash } = createPasswordRecord(password);
    const result = await client.query<BasicUserRow>(
      `
        UPDATE users
        SET password_hash = $2,
            password_salt = $3,
            failed_login_attempts = 0,
            locked_until = NULL,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, name, role, email_verified_at
      `,
      [userId, hash, salt],
    );

    await client.query(
      `
        UPDATE user_auth_tokens
        SET consumed_at = NOW()
        WHERE token_hash = $1
      `,
      [tokenHash],
    );
    await client.query("COMMIT");
    return result.rowCount ? toAuthUser(result.rows[0]) : null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(48).toString("hex");
  const tokenHash = hashOpaqueToken(token);

  await pool.query(
    `
      INSERT INTO user_sessions (token_hash, user_id, expires_at)
      VALUES ($1, $2, NOW() + ($3 || ' days')::interval)
    `,
    [tokenHash, userId, String(SESSION_TTL_DAYS)],
  );

  return token;
}

export async function getUserBySessionToken(token: string): Promise<AuthUser | null> {
  const tokenHash = hashOpaqueToken(token);
  const result = await pool.query<BasicUserRow>(
    `
      SELECT u.id, u.email, u.name, u.role, u.email_verified_at
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > NOW()
      LIMIT 1
    `,
    [tokenHash],
  );

  return result.rowCount ? toAuthUser(result.rows[0]) : null;
}

export async function deleteSession(token: string) {
  const tokenHash = hashOpaqueToken(token);
  await pool.query("DELETE FROM user_sessions WHERE token_hash = $1", [tokenHash]);
}

export async function listUsers() {
  const result = await pool.query<AdminUserListRow>(
    `
      SELECT
        u.id,
        u.email,
        u.name,
        u.role,
        u.email_verified_at,
        u.created_at,
        u.failed_login_attempts,
        u.locked_until,
        COUNT(s.token_hash)::text AS active_sessions
      FROM users u
      LEFT JOIN user_sessions s
        ON s.user_id = u.id
       AND s.expires_at > NOW()
      GROUP BY u.id, u.email, u.name, u.role, u.email_verified_at, u.created_at, u.failed_login_attempts, u.locked_until
      ORDER BY created_at ASC
    `,
  );

  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    emailVerified: Boolean(row.email_verified_at),
    createdAt: row.created_at,
    failedLoginAttempts: row.failed_login_attempts,
    lockedUntil: row.locked_until,
    activeSessions: Number(row.active_sessions || "0"),
  }));
}

export async function updateUserRole(targetUserId: string, nextRole: UserRole, actorUserId: string) {
  if (targetUserId === actorUserId && nextRole !== "admin") {
    throw new Error("SELF_ROLE_DOWNGRADE_NOT_ALLOWED");
  }

  const current = await findUserById(targetUserId);
  if (!current) {
    return null;
  }

  if (current.role === "admin" && nextRole !== "admin") {
    const adminCountResult = await pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM users WHERE role = 'admin'");
    const adminCount = Number(adminCountResult.rows[0]?.count || "0");
    if (adminCount <= 1) {
      throw new Error("LAST_ADMIN_DOWNGRADE_NOT_ALLOWED");
    }
  }

  const result = await pool.query<BasicUserRow>(
    `
      UPDATE users
      SET role = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, name, role, email_verified_at
    `,
    [targetUserId, nextRole],
  );

  return result.rowCount ? toAuthUser(result.rows[0]) : null;
}

export async function setUserLockState(targetUserId: string, lock: boolean) {
  const result = await pool.query<{
    id: string;
    email: string;
    name: string;
    role: UserRole;
    email_verified_at: string | null;
    failed_login_attempts: number;
    locked_until: string | null;
  }>(
    `
      UPDATE users
      SET failed_login_attempts = CASE WHEN $2 THEN GREATEST(failed_login_attempts, $3) ELSE 0 END,
          locked_until = CASE WHEN $2 THEN NOW() + ($4 || ' minutes')::interval ELSE NULL END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, name, role, email_verified_at, failed_login_attempts, locked_until
    `,
    [targetUserId, lock, LOGIN_LOCK_THRESHOLD, String(LOGIN_LOCK_MINUTES)],
  );

  if (!result.rowCount) {
    return null;
  }

  const row = result.rows[0];
  return {
    user: toAuthUser(row),
    failedLoginAttempts: row.failed_login_attempts,
    lockedUntil: row.locked_until,
  };
}

export async function revokeUserSessions(targetUserId: string) {
  const result = await pool.query("DELETE FROM user_sessions WHERE user_id = $1", [targetUserId]);
  return result.rowCount ?? 0;
}

export async function getPersistedState(userId: string): Promise<PersistedAppState> {
  await ensureUserState(userId);

  const result = await pool.query<{ state: PersistedAppState }>("SELECT state FROM app_user_state WHERE user_id = $1", [userId]);

  if (!result.rowCount) {
    const defaults = createDefaultPersistedState();
    await pool.query("INSERT INTO app_user_state (user_id, state) VALUES ($1, $2::jsonb)", [userId, JSON.stringify(defaults)]);
    return defaults;
  }

  return normalizeState(result.rows[0].state);
}

export async function patchPersistedState(userId: string, patch: Partial<PersistedAppState>): Promise<PersistedAppState> {
  const current = await getPersistedState(userId);
  const next = deepMerge(current, patch);

  await pool.query(
    `
      UPDATE app_user_state
      SET state = $2::jsonb,
          updated_at = NOW()
      WHERE user_id = $1
    `,
    [userId, JSON.stringify(next)],
  );

  return next;
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  const user = await findUserById(userId);
  return user ? toAuthUser(user) : null;
}
