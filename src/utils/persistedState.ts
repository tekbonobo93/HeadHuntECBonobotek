import {
  EmailAlertConfig,
  NotificationConfig,
  PersistedAppState,
  UserProfile,
  CustomWeeklyGoal,
} from "../types";

export const DEFAULT_PROFILE: UserProfile = {
  name: "",
  email: "",
  phone: "",
  cvText: "",
  cvFileName: "",
  skills: [],
  experience: [],
  education: [],
  preferences: {
    locationType: "cualquiera",
    jobType: "cualquiera",
    geographicScope: "latam",
    residentCountry: "Perú",
    desiredSalaryRange: {
      min: 1500,
      max: 4000,
      currency: "USD",
    },
    seniorityLevel: "cualquiera",
  },
};

export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  soundType: "classic",
  volume: 0.5,
  desktopEnabled: false,
};

export const createDefaultEmailAlertConfig = (profileEmail = ""): EmailAlertConfig => ({
  email: profileEmail,
  isSubscribed: false,
  frequency: "lunes",
  minCompatibilityScore: 75,
  includeMarketAnalysis: true,
  includeInterviewTips: true,
});

export const DEFAULT_WEEKLY_GOALS: CustomWeeklyGoal[] = [
  {
    id: "goal-postular",
    title: "Postular a empleos interesantes",
    target: 5,
    current: 0,
    type: "postulaciones",
    claimed: false,
  },
  {
    id: "goal-linkedin",
    title: "Contactar reclutadores en LinkedIn",
    target: 3,
    current: 0,
    type: "manual",
    claimed: false,
  },
  {
    id: "goal-entrevista",
    title: "Practicar respuestas de entrevistas",
    target: 2,
    current: 0,
    type: "manual",
    claimed: false,
  },
];

export const createDefaultPersistedState = (): PersistedAppState => ({
  profile: DEFAULT_PROFILE,
  candidacies: [],
  notifications: [],
  userXp: 0,
  xpHistory: [],
  unlockedBadges: [],
  completedInterviewsCount: 0,
  goals: [],
  dailyRecommendationCache: {
    recommendation: null,
    date: null,
    completed: false,
  },
  weeklyGoals: DEFAULT_WEEKLY_GOALS,
  weeklyGoalCycleStart: new Date().toISOString(),
  notificationConfig: DEFAULT_NOTIFICATION_CONFIG,
  emailAlertConfig: createDefaultEmailAlertConfig(),
  simulatedEmails: [],
  cachedJobs: [],
});
