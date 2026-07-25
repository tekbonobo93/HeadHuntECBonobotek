import test from "node:test";
import assert from "node:assert/strict";
const { createDefaultPersistedState, DEFAULT_WEEKLY_GOALS } = await import("../../src/utils/persistedState");

test("createDefaultPersistedState returns expected baseline structure", () => {
  const state = createDefaultPersistedState();

  assert.equal(state.profile.name, "");
  assert.equal(state.notificationConfig.desktopEnabled, false);
  assert.equal(state.emailAlertConfig.isSubscribed, false);
  assert.equal(state.cachedJobs.length, 0);
  assert.equal(state.weeklyGoals.length, DEFAULT_WEEKLY_GOALS.length);
  assert.ok(state.weeklyGoalCycleStart);
});

test("parseCookies handles empty and populated cookie headers", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/headhunt_test";
  const { parseCookies } = await import("../../server/authContext");
  assert.deepEqual(parseCookies(undefined), {});
  assert.deepEqual(parseCookies("foo=bar; hello=world%20ok"), {
    foo: "bar",
    hello: "world ok",
  });
});
