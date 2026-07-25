import { PersistedAppState } from "../types";
import { SEED_CANDIDACIES } from "../data";
import { fetchPersistedState, patchPersistedState } from "./serverState";

const TRACKED_KEYS = new Set([
  "talentomatch_profile",
  "talentomatch_candidacies",
  "talentomatch_notifications",
  "ai_career_xp",
  "ai_xp_history",
  "ai_unlocked_badges",
  "ai_completed_interviews_count",
  "ai_career_goals",
  "talento_match_daily_rec",
  "talento_match_daily_rec_date",
  "talento_match_daily_rec_completed",
  "talentomatch_custom_weekly_goals",
  "talentomatch_weekly_goal_cycle_start",
  "talentomatch_notification_config",
  "talentomatch_email_alert_config",
  "talentomatch_simulated_emails",
  "talentomatch_cached_jobs",
]);

let isInstalled = false;
let isHydrating = false;
let syncTimer: number | undefined;
let syncEnabled = true;

const TRACKED_KEYS_LIST = Array.from(TRACKED_KEYS);

function safeParseJson<T>(value: string | null): T | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function readPersistedPatchFromLocalStorage(): Partial<PersistedAppState> {
  const profile = safeParseJson<PersistedAppState["profile"]>(localStorage.getItem("talentomatch_profile"));
  const candidacies = safeParseJson<PersistedAppState["candidacies"]>(localStorage.getItem("talentomatch_candidacies"));
  const notifications = safeParseJson<PersistedAppState["notifications"]>(localStorage.getItem("talentomatch_notifications"));
  const userXpRaw = localStorage.getItem("ai_career_xp");
  const xpHistory = safeParseJson<PersistedAppState["xpHistory"]>(localStorage.getItem("ai_xp_history"));
  const unlockedBadges = safeParseJson<PersistedAppState["unlockedBadges"]>(localStorage.getItem("ai_unlocked_badges"));
  const completedInterviewsCountRaw = localStorage.getItem("ai_completed_interviews_count");
  const goals = safeParseJson<PersistedAppState["goals"]>(localStorage.getItem("ai_career_goals"));
  const weeklyGoals = safeParseJson<PersistedAppState["weeklyGoals"]>(localStorage.getItem("talentomatch_custom_weekly_goals"));
  const weeklyGoalCycleStart = localStorage.getItem("talentomatch_weekly_goal_cycle_start") || undefined;
  const notificationConfig = safeParseJson<PersistedAppState["notificationConfig"]>(localStorage.getItem("talentomatch_notification_config"));
  const emailAlertConfig = safeParseJson<PersistedAppState["emailAlertConfig"]>(localStorage.getItem("talentomatch_email_alert_config"));
  const simulatedEmails = safeParseJson<PersistedAppState["simulatedEmails"]>(localStorage.getItem("talentomatch_simulated_emails"));
  const cachedJobs = safeParseJson<PersistedAppState["cachedJobs"]>(localStorage.getItem("talentomatch_cached_jobs"));
  const dailyRecommendation = safeParseJson<PersistedAppState["dailyRecommendationCache"]["recommendation"]>(
    localStorage.getItem("talento_match_daily_rec"),
  );
  const dailyRecommendationDate = localStorage.getItem("talento_match_daily_rec_date");
  const dailyRecommendationCompleted = localStorage.getItem("talento_match_daily_rec_completed");

  return {
    ...(profile ? { profile } : {}),
    ...(candidacies ? { candidacies } : {}),
    ...(notifications ? { notifications } : {}),
    ...(userXpRaw ? { userXp: Number(userXpRaw) || 0 } : {}),
    ...(xpHistory ? { xpHistory } : {}),
    ...(unlockedBadges ? { unlockedBadges } : {}),
    ...(completedInterviewsCountRaw ? { completedInterviewsCount: Number(completedInterviewsCountRaw) || 0 } : {}),
    ...(goals ? { goals } : {}),
    ...(weeklyGoals ? { weeklyGoals } : {}),
    ...(weeklyGoalCycleStart ? { weeklyGoalCycleStart } : {}),
    ...(notificationConfig ? { notificationConfig } : {}),
    ...(emailAlertConfig ? { emailAlertConfig } : {}),
    ...(simulatedEmails ? { simulatedEmails } : {}),
    ...(cachedJobs ? { cachedJobs } : {}),
    ...(dailyRecommendation || dailyRecommendationDate || dailyRecommendationCompleted !== null
      ? {
          dailyRecommendationCache: {
            recommendation: dailyRecommendation || null,
            date: dailyRecommendationDate || null,
            completed: dailyRecommendationCompleted === "true",
          },
        }
      : {}),
  };
}

function hasMeaningfulLocalPatch(patch: Partial<PersistedAppState>) {
  return Object.keys(patch).length > 0;
}

function isServerStateEffectivelyEmpty(state: PersistedAppState) {
  return (
    !state.profile.name &&
    !state.profile.email &&
    state.candidacies.length === 0 &&
    state.notifications.length === 0 &&
    state.userXp === 0 &&
    state.goals.length === 0 &&
    state.simulatedEmails.length === 0 &&
    state.cachedJobs.length === 0
  );
}

function mirrorStateToLocalStorage(
  state: PersistedAppState,
  originalSetItem: typeof localStorage.setItem,
  originalRemoveItem: typeof localStorage.removeItem,
) {
  isHydrating = true;
  try {
    originalSetItem("talentomatch_profile", JSON.stringify(state.profile));
    originalSetItem("talentomatch_candidacies", JSON.stringify(state.candidacies));
    originalSetItem("talentomatch_notifications", JSON.stringify(state.notifications));
    originalSetItem("ai_career_xp", String(state.userXp));
    originalSetItem("ai_xp_history", JSON.stringify(state.xpHistory));
    originalSetItem("ai_unlocked_badges", JSON.stringify(state.unlockedBadges));
    originalSetItem("ai_completed_interviews_count", String(state.completedInterviewsCount));
    originalSetItem("ai_career_goals", JSON.stringify(state.goals));
    originalSetItem("talentomatch_custom_weekly_goals", JSON.stringify(state.weeklyGoals));
    originalSetItem("talentomatch_weekly_goal_cycle_start", state.weeklyGoalCycleStart);
    originalSetItem("talentomatch_notification_config", JSON.stringify(state.notificationConfig));
    originalSetItem("talentomatch_email_alert_config", JSON.stringify(state.emailAlertConfig));
    originalSetItem("talentomatch_simulated_emails", JSON.stringify(state.simulatedEmails));
    originalSetItem("talentomatch_cached_jobs", JSON.stringify(state.cachedJobs));

    if (state.dailyRecommendationCache.recommendation) {
      originalSetItem("talento_match_daily_rec", JSON.stringify(state.dailyRecommendationCache.recommendation));
    } else {
      originalRemoveItem("talento_match_daily_rec");
    }

    if (state.dailyRecommendationCache.date) {
      originalSetItem("talento_match_daily_rec_date", state.dailyRecommendationCache.date);
    } else {
      originalRemoveItem("talento_match_daily_rec_date");
    }

    if (state.dailyRecommendationCache.completed) {
      originalSetItem("talento_match_daily_rec_completed", "true");
    } else {
      originalRemoveItem("talento_match_daily_rec_completed");
    }
  } finally {
    isHydrating = false;
  }
}

export async function initializeClientPersistence() {
  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);

  let state = await fetchPersistedState();
  const localPatch = readPersistedPatchFromLocalStorage();

  if (isServerStateEffectivelyEmpty(state) && hasMeaningfulLocalPatch(localPatch)) {
    state = await patchPersistedState(localPatch);
  }

  if (state.candidacies.length === 0) {
    state = await patchPersistedState({ candidacies: SEED_CANDIDACIES });
  }

  mirrorStateToLocalStorage(state, originalSetItem, originalRemoveItem);

  if (isInstalled) {
    return;
  }

  const scheduleSync = () => {
    if (isHydrating || !syncEnabled) return;
    if (syncTimer) {
      window.clearTimeout(syncTimer);
    }

    syncTimer = window.setTimeout(() => {
      const patch = readPersistedPatchFromLocalStorage();
      void patchPersistedState(patch).catch((error) => {
        console.error("Failed to sync browser state to PostgreSQL", error);
      });
    }, 150);
  };

  localStorage.setItem = ((key: string, value: string) => {
    originalSetItem(key, value);
    if (TRACKED_KEYS.has(key)) {
      scheduleSync();
    }
  }) as typeof localStorage.setItem;

  localStorage.removeItem = ((key: string) => {
    originalRemoveItem(key);
    if (TRACKED_KEYS.has(key)) {
      scheduleSync();
    }
  }) as typeof localStorage.removeItem;

  isInstalled = true;
}

export function clearPersistedLocalState() {
  syncEnabled = false;
  isHydrating = true;
  try {
    for (const key of TRACKED_KEYS_LIST) {
      localStorage.removeItem(key);
    }
  } finally {
    isHydrating = false;
    syncEnabled = true;
  }
}
