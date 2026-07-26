import test from "node:test";
import assert from "node:assert/strict";
import { createServer, Server } from "node:http";

process.env.NODE_ENV = "test";
process.env.AUTH_PREVIEW_LINKS = "true";
process.env.AUTH_RATE_LIMIT_STRATEGY = "memory";
process.env.APP_URL = "http://127.0.0.1:43100";
process.env.TRUST_PROXY = "true";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/headhunt";

let pool: typeof import("../../db").pool;
let initializeDatabase: typeof import("../../db").initializeDatabase;
let createApp: typeof import("../../server/app").createApp;

class TestClient {
  private cookieJar = new Map<string, string>();

  constructor(private readonly baseUrl: string) {}

  private applySetCookie(setCookieHeaders: string[]) {
    for (const cookieHeader of setCookieHeaders) {
      const [rawCookie] = cookieHeader.split(";");
      const [name, value] = rawCookie.split("=");
      this.cookieJar.set(name, value);
    }
  }

  private getCookieHeader() {
    return Array.from(this.cookieJar.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  getRawCookieHeader() {
    return this.getCookieHeader();
  }

  private getCsrfToken() {
    const token = this.cookieJar.get("talentomatch_csrf");
    if (!token) {
      throw new Error("Missing CSRF token in cookie jar.");
    }

    return decodeURIComponent(token);
  }

  async request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    const cookieHeader = this.getCookieHeader();
    if (cookieHeader) {
      headers.set("cookie", cookieHeader);
    }

    const hasBody = init.body !== undefined && init.body !== null;
    const method = (init.method || "GET").toUpperCase();
    if (hasBody) {
      headers.set("content-type", "application/json");
      headers.set("origin", this.baseUrl);
      headers.set("referer", `${this.baseUrl}/`);
      headers.set("x-csrf-token", this.getCsrfToken());
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      method,
      headers,
    });

    const setCookieHeaders = (response.headers as any).getSetCookie?.() as string[] | undefined;
    if (setCookieHeaders?.length) {
      this.applySetCookie(setCookieHeaders);
    } else {
      const fallback = response.headers.get("set-cookie");
      if (fallback) {
        this.applySetCookie([fallback]);
      }
    }

    return response;
  }
}

async function resetDatabase() {
  await pool.query("DELETE FROM user_sessions");
  await pool.query("DELETE FROM user_auth_tokens");
  await pool.query("DELETE FROM app_user_state");
  await pool.query("DELETE FROM users");
}

let server: Server;
const baseUrl = "http://127.0.0.1:43100";

async function registerAndVerify(client: TestClient, payload: { name: string; email: string; password: string }) {
  const registerResponse = await client.request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  assert.equal(registerResponse.status, 201);
  const registerBody = await registerResponse.json() as Record<string, unknown>;
  const previewUrl = new URL(String(registerBody.previewUrl));
  const verifyToken = previewUrl.searchParams.get("token");
  assert.ok(verifyToken);

  const verifyResponse = await client.request("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token: verifyToken }),
  });
  assert.equal(verifyResponse.status, 200);
  return verifyResponse.json() as Promise<Record<string, any>>;
}

test.before(async () => {
  ({ pool, initializeDatabase } = await import("../../db"));
  ({ createApp } = await import("../../server/app"));

  await initializeDatabase();
  await resetDatabase();

  server = createServer(createApp());
  await new Promise<void>((resolve) => {
    server.listen(43100, "127.0.0.1", () => resolve());
  });
});

test.beforeEach(async () => {
  await resetDatabase();
});

test.after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  if (pool) {
    await resetDatabase();
    await pool.end();
  }
});

test("auth flow can register, verify, persist state, and access admin snapshot", async () => {
  const client = new TestClient(baseUrl);

  const anonymousSession = await client.request("/api/auth/session");
  assert.equal(anonymousSession.status, 200);

  const verifyBody = await registerAndVerify(client, {
    name: "Admin Test",
    email: "admin.test@example.com",
    password: "supersecreto123",
  });
  assert.equal(verifyBody.authenticated, true);
  assert.equal(verifyBody.user.role, "admin");

  const patchStateResponse = await client.request("/api/state", {
    method: "PATCH",
    body: JSON.stringify({
      profile: {
        name: "Admin Test Updated",
      },
    }),
  });
  assert.equal(patchStateResponse.status, 200);
  const patchedState = await patchStateResponse.json() as Record<string, any>;
  assert.equal(patchedState.profile.name, "Admin Test Updated");

  const getStateResponse = await client.request("/api/state");
  assert.equal(getStateResponse.status, 200);
  const currentState = await getStateResponse.json() as Record<string, any>;
  assert.equal(currentState.profile.name, "Admin Test Updated");

  const adminUsersResponse = await client.request("/api/admin/users");
  assert.equal(adminUsersResponse.status, 200);
  const usersBody = await adminUsersResponse.json() as Record<string, any>;
  assert.equal(usersBody.users.length, 1);

  const observabilityResponse = await client.request("/api/admin/observability");
  assert.equal(observabilityResponse.status, 200);
  const observabilityBody = await observabilityResponse.json() as Record<string, any>;
  assert.ok(observabilityBody.database);
  assert.ok(observabilityBody.requests);

  const securityEventsResponse = await client.request("/api/admin/security-events");
  assert.equal(securityEventsResponse.status, 200);
  const securityEventsBody = await securityEventsResponse.json() as Record<string, any>;
  assert.ok(Array.isArray(securityEventsBody.events));
});

test("csrf protection blocks state mutation without csrf header", async () => {
  const client = new TestClient(baseUrl);

  await client.request("/api/auth/session");

  await registerAndVerify(client, {
    name: "User Test",
    email: "user.test@example.com",
    password: "supersecreto123",
  });

  const cookieHeader = "cookie";
  const sessionCookie = client.getRawCookieHeader();
  const response = await fetch(`${baseUrl}/api/state`, {
    method: "PATCH",
    headers: {
      [cookieHeader]: sessionCookie,
      "content-type": "application/json",
      origin: baseUrl,
      referer: `${baseUrl}/`,
    },
    body: JSON.stringify({ profile: { name: "Nope" } }),
  });

  assert.equal(response.status, 403);
});

test("non-admin users cannot access admin endpoints", async () => {
  const client = new TestClient(baseUrl);

  await client.request("/api/auth/session");

  const verifyBody = await registerAndVerify(client, {
    name: "Regular User",
    email: "regular.user@example.com",
    password: "supersecreto123",
  });
  assert.equal(verifyBody.user.role, "user");

  const usersResponse = await client.request("/api/admin/users");
  assert.equal(usersResponse.status, 403);

  const observabilityResponse = await client.request("/api/admin/observability");
  assert.equal(observabilityResponse.status, 403);

  const securityEventsResponse = await client.request("/api/admin/security-events");
  assert.equal(securityEventsResponse.status, 403);
});

test("anonymous users cannot access admin endpoints", async () => {
  const client = new TestClient(baseUrl);

  await client.request("/api/auth/session");

  const usersResponse = await client.request("/api/admin/users");
  assert.equal(usersResponse.status, 401);

  const observabilityResponse = await client.request("/api/admin/observability");
  assert.equal(observabilityResponse.status, 401);

  const securityEventsResponse = await client.request("/api/admin/security-events");
  assert.equal(securityEventsResponse.status, 401);
});

test("admin can mutate user access and guardrails are enforced", async () => {
  const adminClient = new TestClient(baseUrl);
  await adminClient.request("/api/auth/session");

  const adminBody = await registerAndVerify(adminClient, {
    name: "Admin Owner",
    email: "owner.admin@example.com",
    password: "supersecreto123",
  });
  assert.equal(adminBody.user.role, "admin");

  const userClient = new TestClient(baseUrl);
  await userClient.request("/api/auth/session");
  const regularBody = await registerAndVerify(userClient, {
    name: "Operator User",
    email: "operator.user@example.com",
    password: "supersecreto123",
  });
  assert.equal(regularBody.user.role, "user");

  const listResponse = await adminClient.request("/api/admin/users");
  assert.equal(listResponse.status, 200);
  const listBody = await listResponse.json() as Record<string, any>;
  const targetUser = listBody.users.find((user: any) => user.email === "operator.user@example.com");
  assert.ok(targetUser);

  const promoteResponse = await adminClient.request(`/api/admin/users/${targetUser.id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role: "admin" }),
  });
  assert.equal(promoteResponse.status, 200);
  const promoteBody = await promoteResponse.json() as Record<string, any>;
  assert.equal(promoteBody.user.role, "admin");

  const lockResponse = await adminClient.request(`/api/admin/users/${targetUser.id}/lock`, {
    method: "PATCH",
    body: JSON.stringify({ locked: true }),
  });
  assert.equal(lockResponse.status, 200);
  const lockBody = await lockResponse.json() as Record<string, any>;
  assert.equal(typeof lockBody.lockedUntil, "string");

  const revokeResponse = await adminClient.request(`/api/admin/users/${targetUser.id}/revoke-sessions`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  assert.equal(revokeResponse.status, 200);
  const revokeBody = await revokeResponse.json() as Record<string, any>;
  assert.equal(typeof revokeBody.revokedSessions, "number");

  const selfLockResponse = await adminClient.request(`/api/admin/users/${adminBody.user.id}/lock`, {
    method: "PATCH",
    body: JSON.stringify({ locked: true }),
  });
  assert.equal(selfLockResponse.status, 400);

  const selfRoleDowngradeResponse = await adminClient.request(`/api/admin/users/${adminBody.user.id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role: "user" }),
  });
  assert.equal(selfRoleDowngradeResponse.status, 400);
});
