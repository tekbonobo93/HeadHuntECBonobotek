/**
 * Types definition for the Job Match and Application Tracker app.
 */

export interface SearchPreferences {
  locationType: 'remoto' | 'presencial' | 'hibrido' | 'cualquiera';
  jobType: 'completa' | 'parcial' | 'cualquiera';
  geographicScope: 'pais' | 'latam' | 'global';
  residentCountry: string;
  desiredSalaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  seniorityLevel: 'trainee' | 'junior' | 'semi-senior' | 'senior' | 'cualquiera';
}

export interface ExperienceItem {
  company: string;
  role: string;
  duration: string;
  description: string;
}

export interface EducationItem {
  institution: string;
  degree: string;
  duration?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  cvText: string;
  cvFileName: string;
  skills: string[];
  experience: ExperienceItem[];
  preferences: SearchPreferences;
  education?: EducationItem[];
  skillCategories?: Record<string, string>;
}

export interface JobOffer {
  id: string;
  title: string;
  company: string;
  location: string;
  locationType: 'remoto' | 'presencial' | 'hibrido';
  jobType: 'completa' | 'parcial';
  salary: string;
  description: string;
  requirements: string[];
  sourcePlatform: string;
  compatibilityScore: number;
  compatibilityAnalysis: string;
  seniorityLevel: 'trainee' | 'junior' | 'semi-senior' | 'senior';
  postedDate: string;
  applyUrl?: string;
}

export interface Candidacy {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  location: string;
  locationType: 'remoto' | 'presencial' | 'hibrido';
  status: 'guardado' | 'postulado' | 'entrevista' | 'ofrecido' | 'rechazado';
  appliedDate: string;
  notes: string;
  history: {
    date: string;
    status: 'guardado' | 'postulado' | 'entrevista' | 'ofrecido' | 'rechazado';
    comment: string;
  }[];
  reminderDate?: string;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  preferences: SearchPreferences;
  timestamp: string;
  resultsCount: number;
}

export interface AIRecommendation {
  title: string;
  category: 'cv' | 'skills' | 'interview' | 'market';
  description: string;
  actionableSteps: string[];
}

export interface JobNotification {
  id: string;
  title: string;
  message: string;
  job: JobOffer;
  isRead: boolean;
  timestamp: string;
}

export interface CareerGoal {
  id: string;
  title: string;
  category: 'cv' | 'skills' | 'interview' | 'market';
  description: string;
  actionableSteps: { text: string; completed: boolean }[];
  quizPassed: boolean;
  quizScore?: number;
  dateAdopted: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface DailyRecommendation {
  title: string;
  category: 'cv' | 'skills' | 'interview' | 'market';
  action: string;
  reasoning: string;
  specificInstruction: string;
  marketTrend: string;
}

export type SoundType = "classic" | "cyber" | "success" | "gentle" | "none";

export interface NotificationConfig {
  soundType: SoundType;
  volume: number;
  desktopEnabled: boolean;
}

export interface EmailAlertConfig {
  email: string;
  isSubscribed: boolean;
  frequency: "lunes" | "viernes" | "quincenal";
  minCompatibilityScore: number;
  includeMarketAnalysis: boolean;
  includeInterviewTips: boolean;
}

export interface SimulatedEmail {
  id: string;
  subject: string;
  sentDate: string;
  sender: string;
  bodyHtml: string;
  jobsCount: number;
  jobTitles: string[];
}

export interface XpHistoryItem {
  id: string;
  text: string;
  xp: number;
  date: string;
}

export interface DailyRecommendationCache {
  recommendation: DailyRecommendation | null;
  date: string | null;
  completed: boolean;
}

export interface CustomWeeklyGoal {
  id: string;
  title: string;
  target: number;
  current: number;
  type: "postulaciones" | "manual";
  claimed: boolean;
}

export interface PersistedAppState {
  profile: UserProfile;
  candidacies: Candidacy[];
  notifications: JobNotification[];
  userXp: number;
  xpHistory: XpHistoryItem[];
  unlockedBadges: string[];
  completedInterviewsCount: number;
  goals: CareerGoal[];
  dailyRecommendationCache: DailyRecommendationCache;
  weeklyGoals: CustomWeeklyGoal[];
  weeklyGoalCycleStart: string;
  notificationConfig: NotificationConfig;
  emailAlertConfig: EmailAlertConfig;
  simulatedEmails: SimulatedEmail[];
  cachedJobs: JobOffer[];
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  emailVerified: boolean;
}

export interface AuthSessionResponse {
  authenticated: boolean;
  user: AuthUser | null;
  message?: string;
  previewUrl?: string | null;
  requiresEmailVerification?: boolean;
  passwordResetEmailSent?: boolean;
  verificationEmailSent?: boolean;
  lockedUntil?: string | null;
}

