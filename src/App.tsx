import React, { lazy, Suspense, useEffect, useState } from "react";
import { Sparkles, Briefcase, ListTodo, ClipboardList, GraduationCap, UserCircle, Globe, Settings, Terminal, CheckCircle2, ChevronRight, AlertCircle, BarChart2, Sun, Moon, TrendingUp, Clock, Bell, LogOut } from "lucide-react";
import { AuthUser, UserProfile, Candidacy, JobOffer, JobNotification } from "./types";
import {
  loadNotificationConfig,
  playSynthesizedNotification,
  sendDesktopNotification
} from "./utils/notificationSystem";
import PreferencesForm from "./components/PreferencesForm";
import NotificationCenter from "./components/NotificationCenter";
import { SEED_CANDIDACIES, SIMULATED_JOB_POOL } from "./data";

const CVUploader = lazy(() => import("./components/CVUploader"));
const JobBoard = lazy(() => import("./components/JobBoard"));
const ApplicationsTracker = lazy(() => import("./components/ApplicationsTracker"));
const CandidaciesHistory = lazy(() => import("./components/CandidaciesHistory"));
const AIInsights = lazy(() => import("./components/AIInsights"));
const UserProfileView = lazy(() => import("./components/UserProfileView"));
const SearchStats = lazy(() => import("./components/SearchStats"));
const MarketAnalysis = lazy(() => import("./components/MarketAnalysis"));
const DailyRecommendation = lazy(() => import("./components/DailyRecommendation"));
const WeeklyGoals = lazy(() => import("./components/WeeklyGoals"));
const LinkedInSimPopup = lazy(() => import("./components/LinkedInSimPopup"));

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  email: "",
  phone: "",
  cvText: "",
  cvFileName: "",
  skills: [],
  experience: [],
  education: [],
  preferences: {
    locationType: 'cualquiera',
    jobType: 'cualquiera',
    geographicScope: 'latam',
    residentCountry: 'Perú',
    desiredSalaryRange: {
      min: 1500,
      max: 4000,
      currency: 'USD'
    },
    seniorityLevel: 'cualquiera'
  }
};

interface AppProps {
  authUser: AuthUser | null;
  onLogout: () => void | Promise<void>;
}

function SectionLoader() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
        Cargando modulo...
      </div>
    </div>
  );
}

export default function App({ authUser, onLogout }: AppProps) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [candidacies, setCandidacies] = useState<Candidacy[]>([]);
  const [activeTab, setActiveTab] = useState<'tracker' | 'jobs' | 'candidacies' | 'insights' | 'profile'>('tracker');
  const [trackerViewMode, setTrackerViewMode] = useState<'kanban' | 'stats' | 'market'>('kanban');
  const [isAnalyzingCv, setIsAnalyzingCv] = useState(false);
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<JobNotification[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Periodically update current time to trigger dynamic reminders when their time arrives
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000); // Check every 15 seconds
    return () => clearInterval(timer);
  }, []);

  // Filter out candidacies whose reminder date is in the past or exactly now
  const activeReminders = candidacies.filter(c => {
    if (!c.reminderDate) return false;
    const remTime = new Date(c.reminderDate);
    return !isNaN(remTime.getTime()) && currentTime >= remTime;
  });

  // Dark Mode state & sync
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("talentomatch_theme");
    return saved === "dark";
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newVal = !prev;
      localStorage.setItem("talentomatch_theme", newVal ? "dark" : "light");
      return newVal;
    });
  };

  // Gamification & XP State
  const [userXp, setUserXp] = useState<number>(() => {
    const stored = localStorage.getItem("ai_career_xp");
    return stored ? parseInt(stored, 10) : 0;
  });

  useEffect(() => {
    const handleSyncXp = () => {
      const stored = localStorage.getItem("ai_career_xp");
      if (stored) {
        setUserXp(parseInt(stored, 10));
      }
    };
    window.addEventListener("xp-updated", handleSyncXp);
    window.addEventListener("storage", handleSyncXp);
    return () => {
      window.removeEventListener("xp-updated", handleSyncXp);
      window.removeEventListener("storage", handleSyncXp);
    };
  }, []);

  const handleAwardXp = (amount: number, reason: string) => {
    setUserXp(prev => {
      const newXp = Math.max(0, prev + amount);
      localStorage.setItem("ai_career_xp", newXp.toString());
      return newXp;
    });
    const storedHistory = localStorage.getItem("ai_xp_history");
    let history = [];
    if (storedHistory) {
      try {
        history = JSON.parse(storedHistory);
      } catch (e) {}
    }
    const newItem = {
      id: Math.random().toString(36).substring(2, 9),
      text: reason,
      xp: amount,
      date: new Date().toLocaleDateString("es-ES")
    };
    localStorage.setItem("ai_xp_history", JSON.stringify([newItem, ...history].slice(0, 50)));
    
    // Trigger window event for other components to update
    window.dispatchEvent(new CustomEvent("xp-updated"));
  };

  const getLevelInfo = (xp: number) => {
    if (xp < 150) {
      return {
        level: 1,
        title: "Aprendiz",
        progressPercent: Math.round((xp / 150) * 100),
        color: "from-blue-500 to-indigo-500"
      };
    } else if (xp < 400) {
      const levelXp = xp - 150;
      return {
        level: 2,
        title: "Postulante",
        progressPercent: Math.round((levelXp / 250) * 100),
        color: "from-indigo-500 to-purple-500"
      };
    } else if (xp < 800) {
      const levelXp = xp - 400;
      return {
        level: 3,
        title: "Candidato",
        progressPercent: Math.round((levelXp / 400) * 100),
        color: "from-purple-500 to-pink-500"
      };
    } else if (xp < 1500) {
      const levelXp = xp - 800;
      return {
        level: 4,
        title: "Profesional",
        progressPercent: Math.round((levelXp / 700) * 100),
        color: "from-pink-500 to-amber-500"
      };
    } else {
      return {
        level: 5,
        title: "Experto",
        progressPercent: 100,
        color: "from-amber-500 to-emerald-500"
      };
    }
  };


  // Load from LocalStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem("talentomatch_profile");
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch (e) {
        console.error("Error loading profile", e);
      }
    }

    const savedCandidacies = localStorage.getItem("talentomatch_candidacies");
    if (savedCandidacies) {
      try {
        const parsed = JSON.parse(savedCandidacies);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCandidacies(parsed);
        } else {
          // If empty array, seed it
          setCandidacies(SEED_CANDIDACIES);
          localStorage.setItem("talentomatch_candidacies", JSON.stringify(SEED_CANDIDACIES));
        }
      } catch (e) {
        console.error("Error loading candidacies", e);
        // Seed as fallback
        setCandidacies(SEED_CANDIDACIES);
        localStorage.setItem("talentomatch_candidacies", JSON.stringify(SEED_CANDIDACIES));
      }
    } else {
      // No entry in localStorage, seed
      setCandidacies(SEED_CANDIDACIES);
      localStorage.setItem("talentomatch_candidacies", JSON.stringify(SEED_CANDIDACIES));
    }

    const savedNotifications = localStorage.getItem("talentomatch_notifications");
    if (savedNotifications) {
      try {
        setNotifications(JSON.parse(savedNotifications));
      } catch (e) {
        console.error("Error loading notifications", e);
      }
    }
  }, []);

  // Listen for simulated LinkedIn OAuth callback success message
  useEffect(() => {
    const handleLinkedInMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }

      if (event.data?.type === 'LINKEDIN_SYNC_SUCCESS') {
        const importedData = event.data.data;
        if (importedData) {
          setProfile(prev => {
            const merged: UserProfile = {
              ...prev,
              name: importedData.name || prev.name,
              email: importedData.email || prev.email,
              phone: importedData.phone || prev.phone,
              skills: Array.from(new Set([...(importedData.skills || []), ...prev.skills])),
              experience: [...(importedData.experience || []), ...prev.experience],
              cvFileName: prev.cvFileName || "Importado de LinkedIn"
            };
            localStorage.setItem("talentomatch_profile", JSON.stringify(merged));
            return merged;
          });

          handleAwardXp(150, "Sincronización Exitosa con LinkedIn");
          playNotificationSound();
          triggerNotification("🎉 ¡Habilidades y experiencias importadas de LinkedIn con IA!");
        }
      }
    };

    window.addEventListener("message", handleLinkedInMessage);
    return () => window.removeEventListener("message", handleLinkedInMessage);
  }, []);

  // Save changes helper
  const saveProfileToLocalStorage = (updated: UserProfile) => {
    setProfile(updated);
    localStorage.setItem("talentomatch_profile", JSON.stringify(updated));
  };

  const saveCandidaciesToLocalStorage = (updated: Candidacy[]) => {
    setCandidacies(updated);
    localStorage.setItem("talentomatch_candidacies", JSON.stringify(updated));
  };

  const handleAnalysisComplete = (extractedProfile: Partial<UserProfile>) => {
    const merged: UserProfile = {
      ...profile,
      name: extractedProfile.name || profile.name,
      email: extractedProfile.email || profile.email,
      phone: extractedProfile.phone || profile.phone,
      skills: extractedProfile.skills || profile.skills,
      experience: extractedProfile.experience || profile.experience,
      education: extractedProfile.education || profile.education || [],
      cvText: extractedProfile.cvText || profile.cvText,
      cvFileName: extractedProfile.cvFileName || profile.cvFileName,
    };
    saveProfileToLocalStorage(merged);
    triggerNotification("¡Currículum analizado con éxito por la IA! Revisa tus detalles.");
    setActiveTab('profile'); // Send them to review
  };

  const triggerNotification = (msg: string) => {
    setShowNotification(msg);
    setTimeout(() => {
      setShowNotification(null);
    }, 4000);
  };

  const playNotificationSound = () => {
    try {
      const config = loadNotificationConfig();
      playSynthesizedNotification(config.soundType, config.volume);
    } catch (e) {
      console.warn("Audio Context blocked or failed to play:", e);
    }
  };

  const simulateNewJobMatch = (forced = false) => {
    if (SIMULATED_JOB_POOL.length === 0) return;
    
    setNotifications(prev => {
      const existingJobIds = prev.map(n => n.job.id);
      const availableJobs = SIMULATED_JOB_POOL.filter(j => !existingJobIds.includes(j.id));
      const poolToChoose = availableJobs.length > 0 ? availableJobs : SIMULATED_JOB_POOL;
      const randomRawJob = poolToChoose[Math.floor(Math.random() * poolToChoose.length)];

      let score = 65;
      const reasonParts: string[] = [];

      const matchesLocationType = profile.preferences.locationType === 'cualquiera' || 
                                  profile.preferences.locationType === randomRawJob.locationType;
      if (matchesLocationType) {
        score += 15;
        reasonParts.push(`entorno ${randomRawJob.locationType}`);
      }

      const matchesSeniority = profile.preferences.seniorityLevel === 'cualquiera' || 
                               profile.preferences.seniorityLevel === randomRawJob.seniorityLevel;
      if (matchesSeniority) {
        score += 10;
        reasonParts.push(`nivel ${randomRawJob.seniorityLevel}`);
      }

      const matchingSkills = randomRawJob.requirements.filter(req => 
        profile.skills.some(skill => skill.toLowerCase().includes(req.toLowerCase()) || req.toLowerCase().includes(skill.toLowerCase()))
      );

      if (matchingSkills.length > 0) {
        score += 15;
        reasonParts.push(`habilidades (${matchingSkills.slice(0, 2).join(", ")})`);
      }

      score = Math.min(Math.max(score, 60), 98);

      const analysis = `Esta oferta de empleo encaja muy bien con tu perfil gracias a las siguientes coincidencias clave:
1. Modalidad: Se adapta perfectamente a tu preferencia de trabajo ${randomRawJob.locationType}.
2. Experiencia: Busca un perfil ${randomRawJob.seniorityLevel}, que está alineado con tus expectativas de carrera.
3. Competencias: Las habilidades de tu currículum se relacionan directamente con sus requisitos de ${randomRawJob.requirements.slice(0, 3).join(", ")}.

¿Por qué es un excelente match?
Tiene un puntaje de compatibilidad estimado de ${score}%. Te sugerimos guardar este puesto laboral en tu panel y preparar tu postulación rápida.`;

      const finalJob: JobOffer = {
        ...randomRawJob,
        compatibilityScore: score,
        compatibilityAnalysis: analysis
      } as JobOffer;

      let reasonText = "¡Nueva vacante detectada para ti!";
      if (reasonParts.length > 0) {
        reasonText = `Coincide con tu preferencia de ${reasonParts.join(" y ")}.`;
      }

      const newNotification: JobNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title: "¡Match Inteligente Detectado!",
        message: reasonText,
        job: finalJob,
        isRead: false,
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) + " - Hoy"
      };

      const updated = [newNotification, ...prev];
      localStorage.setItem("talentomatch_notifications", JSON.stringify(updated));

      playNotificationSound();
      sendDesktopNotification(
        `🎯 Match de Empleo (${score}%)`,
        `${finalJob.title} en ${finalJob.company} (${finalJob.salary})`
      );
      triggerNotification(`🔔 ¡Nueva vacante: ${finalJob.title} en ${finalJob.company} (${score}% Match)!`);

      return updated;
    });
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, isRead: true } : n);
      localStorage.setItem("talentomatch_notifications", JSON.stringify(updated));
      return updated;
    });
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, isRead: true }));
      localStorage.setItem("talentomatch_notifications", JSON.stringify(updated));
      return updated;
    });
    triggerNotification("Todas las alertas marcadas como leídas.");
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
    localStorage.removeItem("talentomatch_notifications");
    triggerNotification("Historial de alertas eliminado.");
  };

  // Background timer loop for automated job discovery matching configuration
  useEffect(() => {
    if (!profile.name) return;

    const interval = setInterval(() => {
      if (Math.random() < 0.3) {
        simulateNewJobMatch(false);
      }
    }, 40000);

    return () => clearInterval(interval);
  }, [profile.name, profile.preferences, profile.skills]);

  const handlePreferencesChange = (updatedPrefs: UserProfile['preferences']) => {
    const updated = {
      ...profile,
      preferences: updatedPrefs
    };
    saveProfileToLocalStorage(updated);
  };

  const handleSaveJob = (job: JobOffer, status: 'guardado' | 'postulado') => {
    // Check if already exists in pipeline
    if (candidacies.some(c => c.jobId === job.id)) {
      triggerNotification("Ya tienes registrado este proceso laboral.");
      return;
    }

    const newCandidacy: Candidacy = {
      id: `cand-${Date.now()}`,
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      location: job.location,
      locationType: job.locationType,
      status: status,
      appliedDate: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
      notes: status === "postulado" ? "Postulado a través del escáner de IA." : "Guardado para revisión posterior.",
      history: [
        {
          date: new Date().toLocaleDateString('es-ES'),
          status: status,
          comment: `Candidatura agregada como ${status}.`
        }
      ]
    };

    const updatedList = [newCandidacy, ...candidacies];
    saveCandidaciesToLocalStorage(updatedList);
    triggerNotification(`¡Empleo agregado con éxito a tus ${status}s!`);
  };

  const handleUpdateCandidacy = (id: string, updatedFields: Partial<Candidacy>) => {
    const updated = candidacies.map(c => {
      if (c.id === id) {
        const historyItem = updatedFields.status ? {
          date: new Date().toLocaleDateString('es-ES'),
          status: updatedFields.status,
          comment: `Estado de postulación cambiado a ${updatedFields.status}.`
        } : null;

        return {
          ...c,
          ...updatedFields,
          history: historyItem ? [...c.history, historyItem] : c.history
        };
      }
      return c;
    });
    saveCandidaciesToLocalStorage(updated);
    if (updatedFields.status) {
      triggerNotification(`Estado cambiado a ${updatedFields.status}`);
    }
  };

  const handleDeleteCandidacy = (id: string) => {
    const updated = candidacies.filter(c => c.id !== id);
    saveCandidaciesToLocalStorage(updated);
    triggerNotification("Candidatura eliminada.");
  };

  const handleAddCustomCandidacy = (customData: Omit<Candidacy, 'id' | 'appliedDate' | 'history'>) => {
    const newCandidacy: Candidacy = {
      id: `cand-${Date.now()}`,
      jobId: customData.jobId,
      jobTitle: customData.jobTitle,
      company: customData.company,
      location: customData.location,
      locationType: customData.locationType,
      status: customData.status,
      appliedDate: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
      notes: customData.notes || "Agregada manualmente.",
      history: [
        {
          date: new Date().toLocaleDateString('es-ES'),
          status: customData.status,
          comment: "Candidatura registrada manualmente."
        }
      ]
    };

    const updated = [newCandidacy, ...candidacies];
    saveCandidaciesToLocalStorage(updated);
    triggerNotification("Candidatura manual agregada con éxito.");
  };

  const handleUpdateProfileDirectly = (updatedProfile: UserProfile) => {
    saveProfileToLocalStorage(updatedProfile);
    triggerNotification("Perfil actualizado.");
  };

  // Profile readiness status indicator
  const hasSkills = profile.skills && profile.skills.length > 0;
  const isProfileComplete = profile.name && hasSkills;

  const savedJobIds = candidacies.filter(c => c.status === 'guardado').map(c => c.jobId);
  const appliedJobIds = candidacies.filter(c => c.status !== 'guardado').map(c => c.jobId);

  if (typeof window !== "undefined" && window.location.pathname === "/auth/linkedin-sim") {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-50 p-6"><SectionLoader /></div>}>
        <LinkedInSimPopup />
      </Suspense>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-50 text-slate-900 flex overflow-hidden font-sans">
      {/* Dynamic Slide-in Alert Notification */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-xl border border-slate-800 shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{showNotification}</span>
        </div>
      )}

      {/* Sidebar Nav - Desktop */}
      <aside className="w-20 bg-slate-900 flex flex-col items-center py-8 justify-between border-r border-slate-800 shrink-0 hidden md:flex h-full">
        <div className="flex flex-col items-center gap-8">
          <div 
            className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-4 cursor-pointer hover:bg-indigo-600 transition-colors"
            onClick={() => setActiveTab('tracker')}
          >
            TM
          </div>
          <nav className="flex flex-col gap-6">
            <button
              onClick={() => setActiveTab('tracker')}
              className={`p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'tracker'
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-105"
                  : "text-slate-500 hover:text-white hover:bg-slate-800"
              }`}
              title="Panel de Control"
            >
              <ListTodo className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('jobs')}
              className={`p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'jobs'
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-105"
                  : "text-slate-500 hover:text-white hover:bg-slate-800"
              }`}
              title="Buscar con IA"
            >
              <Briefcase className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('candidacies')}
              className={`p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'candidacies'
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-105"
                  : "text-slate-500 hover:text-white hover:bg-slate-800"
              }`}
              title="Historial de Candidaturas"
            >
              <ClipboardList className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('insights')}
              className={`p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'insights'
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-105"
                  : "text-slate-500 hover:text-white hover:bg-slate-800"
              }`}
              title="Consejos de Carrera IA"
            >
              <Sparkles className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'profile'
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-105"
                  : "text-slate-500 hover:text-white hover:bg-slate-800"
              }`}
              title="Mi Currículum y Perfil"
            >
              <UserCircle className="w-5 h-5" />
            </button>
          </nav>
        </div>
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-3 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            title={isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-400 animate-pulse" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className="p-3 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            title="Configuración de Perfil"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Main Workspace container */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-slate-200 px-6 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
              TalentoMatch IA
              {isProfileComplete ? (
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  Perfil Inteligente Activo
                </span>
              ) : (
                <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                  CV Pendiente
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              {activeTab === 'tracker' && "Panel de control laboral y monitorización de candidaturas"}
              {activeTab === 'jobs' && "Buscador agregador inteligente de empleo con IA"}
              {activeTab === 'candidacies' && "Historial de postulaciones, tablero Kanban y filtros de búsqueda"}
              {activeTab === 'insights' && "Análisis de carrera inteligente, habilidades y coach"}
              {activeTab === 'profile' && "Configura tu currículum y habilidades clave para el match"}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {authUser && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50">
                <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white font-black text-xs flex items-center justify-center">
                  {authUser.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="leading-tight">
                  <p className="text-[11px] font-black text-slate-800">{authUser.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-slate-400">{authUser.email}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                      authUser.role === "admin" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"
                    }`}>
                      {authUser.role}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* Unified Level & XP Header Widget */}
            <div 
              onClick={() => setActiveTab('insights')}
              className="hidden md:flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800 cursor-pointer transition-all shadow-xs"
              title="Ver mis logros profesionales y nivel"
            >
              <div className={`bg-gradient-to-br ${getLevelInfo(userXp).color} text-white font-black text-[11px] h-6 w-6 rounded-lg flex items-center justify-center shadow-xs`}>
                {getLevelInfo(userXp).level}
              </div>
              <div className="flex flex-col min-w-[95px]">
                <div className="flex items-center justify-between text-[10px] font-black text-slate-700 dark:text-slate-300">
                  <span className="truncate max-w-[60px]">{getLevelInfo(userXp).title}</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-extrabold ml-1">{userXp} XP</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden mt-0.5">
                  <div 
                    className={`bg-gradient-to-r ${getLevelInfo(userXp).color} h-full rounded-full transition-all duration-500`} 
                    style={{ width: `${getLevelInfo(userXp).progressPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-all cursor-pointer flex items-center justify-center bg-white dark:bg-slate-900 dark:border-slate-800"
              title={isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-400" />}
            </button>

            <button
              onClick={() => void onLogout()}
              className="p-2 rounded-xl border border-slate-200 hover:bg-red-50 text-slate-500 hover:text-red-600 transition-all cursor-pointer flex items-center justify-center bg-white"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>

            <NotificationCenter
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllAsRead={handleMarkAllAsRead}
              onClearAll={handleClearAllNotifications}
              onSaveJob={handleSaveJob}
              onTriggerManualSimulation={() => simulateNewJobMatch(true)}
              savedJobIds={savedJobIds}
              appliedJobIds={appliedJobIds}
            />
            <div className="flex -space-x-2">
              <div 
                className="w-10 h-10 rounded-full border-2 border-indigo-100 bg-slate-100 overflow-hidden cursor-pointer hover:border-indigo-500 transition-colors"
                onClick={() => setActiveTab('profile')}
                title="Ver Perfil"
              >
                <img 
                  src={
                    profile.name 
                      ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.name)}`
                      : "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                  } 
                  alt="avatar"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('profile')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-xs hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer hidden sm:block font-sans"
            >
              {profile.cvFileName ? "Actualizar CV" : "Subir CV"}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Header Tabs */}
        <nav className="md:hidden bg-slate-900 border-b border-slate-800 shrink-0 sticky top-0 z-40">
          <div className="flex space-x-1 p-2 overflow-x-auto justify-around">
            <button
              onClick={() => setActiveTab('tracker')}
              className={`py-2 px-3 text-[11px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                activeTab === 'tracker'
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              Tracker ({candidacies.length})
            </button>

            <button
              onClick={() => setActiveTab('jobs')}
              className={`py-2 px-3 text-[11px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                activeTab === 'jobs'
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Buscador
            </button>

            <button
              onClick={() => setActiveTab('candidacies')}
              className={`py-2 px-3 text-[11px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                activeTab === 'candidacies'
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Candidaturas
            </button>

            <button
              onClick={() => setActiveTab('insights')}
              className={`py-2 px-3 text-[11px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                activeTab === 'insights'
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Consejos
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-3 text-[11px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <UserCircle className="w-3.5 h-3.5" />
              Perfil
            </button>
          </div>
        </nav>

        {/* Workspace Scroll Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-slate-50/50">
          {/* Top informative banner stylized as a modern alert/notice block */}
          <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 text-indigo-100 p-5 rounded-2xl shadow-sm border border-indigo-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm md:text-base font-bold text-white">Centraliza, optimiza y gestiona tu búsqueda laboral</h2>
              <p className="text-xs text-indigo-200/90 font-medium max-w-3xl leading-relaxed">
                Sube tu currículum, configura tus filtros salariales y de ubicación, y deja que nuestra Inteligencia Artificial escanee e indexe vacantes de múltiples plataformas en un solo panel de control unificado.
              </p>
            </div>
            {!isProfileComplete && (
              <button
                onClick={() => setActiveTab('profile')}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold shrink-0 transition-all self-start md:self-auto shadow-md shadow-indigo-900/20 cursor-pointer font-sans"
              >
                Completar Perfil
              </button>
            )}
          </div>

          {/* Render Tab Screens */}
          {activeTab === 'tracker' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/80 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Panel de Control Laboral</h2>
                  <p className="text-sm text-slate-500">Mueve tus postulaciones por etapas de selección, guarda notas y monitoriza tu progreso.</p>
                </div>

                {/* View switcher toggle */}
                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60 self-stretch sm:self-auto shrink-0 mt-2 sm:mt-0">
                  <button
                    onClick={() => setTrackerViewMode('kanban')}
                    className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      trackerViewMode === 'kanban'
                        ? "bg-white text-indigo-600 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <ListTodo className="w-3.5 h-3.5" />
                    Tablero Kanban
                  </button>
                  <button
                    onClick={() => setTrackerViewMode('stats')}
                    className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      trackerViewMode === 'stats'
                        ? "bg-white text-indigo-600 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    Estadísticas de Búsqueda
                  </button>
                  <button
                    onClick={() => setTrackerViewMode('market')}
                    className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      trackerViewMode === 'market'
                        ? "bg-white text-indigo-600 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    Análisis de Mercado
                  </button>
                </div>
              </div>

              {/* Reminders list if any is active */}
              {activeReminders.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 md:p-5 shadow-xs space-y-3">
                  <div className="flex items-start gap-2.5 text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-bounce" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">¡Recordatorios de Seguimiento Activos! ({activeReminders.length})</h4>
                      <p className="text-xs text-amber-700/90 dark:text-amber-400/90 font-medium">Es el momento programado para dar seguimiento a las siguientes candidaturas:</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {activeReminders.map(c => (
                      <div key={c.id} className="bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-950 rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow-xs">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                              {c.status.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 shrink-0">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(c.reminderDate!).toLocaleString("es-ES", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                            </span>
                          </div>
                          <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 mt-2 line-clamp-1">{c.jobTitle}</h5>
                          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 line-clamp-1">{c.company}</p>
                          {c.notes && (
                            <p className="text-[10px] text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg mt-2 border border-slate-100 dark:border-slate-800 line-clamp-2">
                              "{c.notes}"
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateCandidacy(c.id, { reminderDate: undefined });
                              handleAwardXp(15, `Seguimiento de candidatura: ${c.jobTitle}`);
                            }}
                            className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center shadow-xs"
                          >
                            Hecho / Descartar (+15 XP)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setHours(d.getHours() + 1);
                              handleUpdateCandidacy(c.id, { reminderDate: d.toISOString() });
                            }}
                            className="px-2.5 py-1.5 border border-amber-200 dark:border-amber-800/80 hover:bg-amber-100/50 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-lg text-[10px] font-semibold transition-all cursor-pointer text-center shrink-0"
                          >
                            Posponer 1h
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Daily Recommendation Section */}
              <Suspense fallback={<SectionLoader />}>
                <DailyRecommendation
                  profile={profile}
                  candidacies={candidacies}
                  onAwardXp={handleAwardXp}
                  isDarkMode={isDarkMode}
                />
              </Suspense>

              {/* Weekly Goals Widget */}
              <Suspense fallback={<SectionLoader />}>
                <WeeklyGoals
                  candidacies={candidacies}
                  onAwardXp={handleAwardXp}
                  isDarkMode={isDarkMode}
                />
              </Suspense>

              {trackerViewMode === 'kanban' ? (
                <>
                  {/* Application pipeline */}
                  <Suspense fallback={<SectionLoader />}>
                    <ApplicationsTracker
                      candidacies={candidacies}
                      onUpdateCandidacy={handleUpdateCandidacy}
                      onDeleteCandidacy={handleDeleteCandidacy}
                      onAddCustomCandidacy={handleAddCustomCandidacy}
                    />
                  </Suspense>

                  {/* Helpful onboarding block if empty pipeline */}
                  {candidacies.length === 0 && (
                    <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 flex flex-col md:flex-row items-center gap-4 shadow-xs">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
                        <Briefcase className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-neutral-900">¿Cómo funciona el Tracker?</h4>
                        <p className="text-xs text-neutral-500">
                          Añade candidaturas manuales o busca empleos con el escáner de IA. Todo se agregará aquí automáticamente para que lleves el seguimiento de tus entrevistas y ofertas sin esfuerzo.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('jobs')}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer ml-auto"
                      >
                        Ir al Buscador
                      </button>
                    </div>
                  )}
                </>
              ) : trackerViewMode === 'stats' ? (
                <Suspense fallback={<SectionLoader />}>
                  <SearchStats candidacies={candidacies} />
                </Suspense>
              ) : (
                <Suspense fallback={<SectionLoader />}>
                  <MarketAnalysis />
                </Suspense>
              )}
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Buscador de Empleo Agregado</h2>
                <p className="text-sm text-neutral-500">
                  La Inteligencia Artificial recopila y centraliza vacantes web que se ajustan a tus criterios de contratación.
                </p>
              </div>

              {/* Smart Preferences & Availability Form */}
              <PreferencesForm
                preferences={profile.preferences}
                onChange={handlePreferencesChange}
              />

              {/* Aggregated Jobs Board */}
              <Suspense fallback={<SectionLoader />}>
                <JobBoard
                  profile={profile}
                  onSaveJob={handleSaveJob}
                  savedJobIds={savedJobIds}
                  appliedJobIds={appliedJobIds}
                />
              </Suspense>
            </div>
          )}

          {activeTab === 'candidacies' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Historial y Monitorización de Candidaturas</h2>
                <p className="text-sm text-neutral-500">
                  Lleva el control de tus procesos, visualiza el pipeline en formato Kanban o filtra tus postulaciones en modo historial.
                </p>
              </div>

              <Suspense fallback={<SectionLoader />}>
                <CandidaciesHistory
                  candidacies={candidacies}
                  onUpdateCandidacy={handleUpdateCandidacy}
                  onDeleteCandidacy={handleDeleteCandidacy}
                  onAddCustomCandidacy={handleAddCustomCandidacy}
                />
              </Suspense>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Career Coach & Insights de IA</h2>
                <p className="text-sm text-neutral-500">Asesoramiento inteligente de carrera y análisis de tus habilidades basado en tu portafolio profesional.</p>
              </div>

              <Suspense fallback={<SectionLoader />}>
                <AIInsights
                  profile={profile}
                  candidacies={candidacies}
                />
              </Suspense>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Mi Perfil y Extracción de CV</h2>
                <p className="text-sm text-neutral-500">Asegura la exactitud de tu perfil para mejorar drásticamente las recomendaciones y búsquedas de la IA.</p>
              </div>

              {/* Interactive CV Uploader / Extractor */}
              <Suspense fallback={<SectionLoader />}>
                <CVUploader
                  onAnalysisComplete={handleAnalysisComplete}
                  isLoading={isAnalyzingCv}
                  setIsLoading={setIsAnalyzingCv}
                />
              </Suspense>

              {/* User Profile display and editing */}
              <Suspense fallback={<SectionLoader />}>
                <UserProfileView
                  profile={profile}
                  onUpdateProfile={handleUpdateProfileDirectly}
                  isDarkMode={isDarkMode}
                  onToggleTheme={toggleTheme}
                />
              </Suspense>
            </div>
          )}

          {/* Footer credits and information */}
          <footer className="bg-white border border-slate-200 rounded-2xl py-6 text-center text-xs text-slate-400 shrink-0 mt-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <p className="font-semibold text-slate-500">
                TalentoMatch IA — Buscador de Empleo y Tracker inteligente unificado por Gemini 3.5.
              </p>
              <p className="mt-1 font-mono text-[10px] text-slate-400">
                © {new Date().getFullYear()} Todos los derechos reservados.
              </p>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
