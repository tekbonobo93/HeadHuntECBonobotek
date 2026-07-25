import test from "node:test";
import assert from "node:assert/strict";
import { createServer, Server } from "node:http";

process.env.NODE_ENV = "test";
process.env.AUTH_PREVIEW_LINKS = "true";
process.env.AUTH_RATE_LIMIT_STRATEGY = "memory";
process.env.APP_URL = "http://127.0.0.1:43100";
process.env.TRUST_PROXY = "true";

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
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await resetDatabase();
  await pool.end();
});

test("auth flow can register, verify, persist state, and access admin snapshot", async () => {
  const client = new TestClient(baseUrl);

  const anonymousSession = await client.request("/api/auth/session");
  assert.equal(anonymousSession.status, 200);

  const registerResponse = await client.request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Admin Test",
      email: "admin.test@example.com",
      password: "supersecreto123",
    }),
  });
  assert.equal(registerResponse.status, 201);
  const registerBody = await registerResponse.json() as Record<string, unknown>;
  assert.equal(registerBody.requiresEmailVerification, true);
  assert.equal(typeof registerBody.previewUrl, "string");

  const previewUrl = new URL(String(registerBody.previewUrl));
  const verifyToken = previewUrl.searchParams.get("token");
  assert.ok(verifyToken);

  const verifyResponse = await client.request("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token: verifyToken }),
  });
  assert.equal(verifyResponse.status, 200);
  const verifyBody = await verifyResponse.json() as Record<string, any>;
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
});

test("csrf protection blocks state mutation without csrf header", async () => {
  const client = new TestClient(baseUrl);

  await client.request("/api/auth/session");

  const registerResponse = await client.request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "User Test",
      email: "user.test@example.com",
      password: "supersecreto123",
    }),
  });
  const registerBody = await registerResponse.json() as Record<string, unknown>;
  const previewUrl = new URL(String(registerBody.previewUrl));
  const verifyToken = previewUrl.searchParams.get("token");

  await client.request("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token: verifyToken }),
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
