const baseUrl = process.env.SMOKE_BASE_URL?.trim();

if (!baseUrl) {
  throw new Error("SMOKE_BASE_URL is required.");
}

async function assertJson(url: string, expectedStatuses: number[]) {
  const response = await fetch(url);
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(`Unexpected status ${response.status} for ${url}`);
  }

  const body = await response.json();
  return { response, body };
}

async function main() {
  const live = await assertJson(`${baseUrl}/health/live`, [200]);
  if (live.body.ok !== true) {
    throw new Error("Liveness check did not return ok=true.");
  }

  const health = await assertJson(`${baseUrl}/health`, [200, 503]);
  if (!health.body || typeof health.body.status !== "string") {
    throw new Error("Readiness payload is missing status.");
  }

  const authSession = await assertJson(`${baseUrl}/api/auth/session`, [200]);
  if (typeof authSession.body.authenticated !== "boolean") {
    throw new Error("Auth session payload is invalid.");
  }

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "smoke.postdeploy.completed",
      baseUrl,
      readinessStatus: health.body.status,
      authenticated: authSession.body.authenticated,
    }),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "smoke.postdeploy.failed",
      baseUrl,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
});
