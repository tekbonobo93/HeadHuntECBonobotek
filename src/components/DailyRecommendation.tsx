import React, { useState, useEffect } from "react";
import { Sparkles, CheckCircle2, RefreshCw, AlertCircle, Award, GraduationCap, BookOpen, Search, Zap, Check } from "lucide-react";
import { DailyRecommendation as DailyRecType, UserProfile, Candidacy } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface DailyRecommendationProps {
  profile: UserProfile;
  candidacies: Candidacy[];
  onAwardXp: (amount: number, reason: string) => void;
  isDarkMode: boolean;
}

export default function DailyRecommendation({
  profile,
  candidacies,
  onAwardXp,
  isDarkMode
}: DailyRecommendationProps) {
  const [recommendation, setRecommendation] = useState<DailyRecType | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [showXpGain, setShowXpGain] = useState<boolean>(false);

  // Load cached recommendation from localStorage to ensure it's "daily" and doesn't spam the API
  useEffect(() => {
    const cachedRec = localStorage.getItem("talento_match_daily_rec");
    const cachedDate = localStorage.getItem("talento_match_daily_rec_date");
    const cachedCompleted = localStorage.getItem("talento_match_daily_rec_completed");
    
    const todayStr = new Date().toLocaleDateString("es-ES");

    if (cachedRec && cachedDate === todayStr) {
      try {
        setRecommendation(JSON.parse(cachedRec));
        setIsCompleted(cachedCompleted === "true");
      } catch (e) {
        // Cache corrupted, will fetch fresh
        fetchDailyRecommendation();
      }
    } else {
      fetchDailyRecommendation();
    }
  }, [profile.skills.length, candidacies.length]);

  const fetchDailyRecommendation = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    if (forceRefresh) {
      setIsCompleted(false);
      localStorage.removeItem("talento_match_daily_rec_completed");
    }

    try {
      const response = await fetch("/api/jobs/daily-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, candidacies })
      });

      if (!response.ok) {
        throw new Error("No se pudo obtener la recomendación diaria.");
      }

      const data = await response.json();
      setRecommendation(data);
      
      const todayStr = new Date().toLocaleDateString("es-ES");
      localStorage.setItem("talento_match_daily_rec", JSON.stringify(data));
      localStorage.setItem("talento_match_daily_rec_date", todayStr);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al conectar con la IA de Gemini.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteAction = () => {
    if (isCompleted) return;
    
    setIsCompleted(true);
    localStorage.setItem("talento_match_daily_rec_completed", "true");
    
    // Show visual XP animation
    setShowXpGain(true);
    
    // Award XP
    onAwardXp(30, `Completaste tu Recomendación Diaria: ${recommendation?.title}`);

    setTimeout(() => {
      setShowXpGain(false);
    }, 3000);
  };

  const getCategoryTheme = (category?: string) => {
    switch (category) {
      case "cv":
        return {
          icon: <Award className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />,
          label: "Optimización de CV",
          bgColor: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/60"
        };
      case "skills":
        return {
          icon: <GraduationCap className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />,
          label: "Habilidades Sugeridas",
          bgColor: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/60"
        };
      case "interview":
        return {
          icon: <BookOpen className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
          label: "Preparación de Entrevista",
          bgColor: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/60"
        };
      case "market":
        return {
          icon: <Search className="w-4 h-4 text-blue-500 dark:text-blue-400" />,
          label: "Análisis de Mercado",
          bgColor: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/60"
        };
      default:
        return {
          icon: <Sparkles className="w-4 h-4 text-indigo-500" />,
          label: "Recomendación IA",
          bgColor: "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200"
        };
    }
  };

  const theme = getCategoryTheme(recommendation?.category);

  return (
    <div 
      id="daily-recommendation-card" 
      className="bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 p-5 shadow-sm transition-all relative overflow-hidden"
    >
      {/* Visual Accent Light Effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-400/5 rounded-full blur-2xl pointer-events-none"></div>
      
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-500/10 dark:bg-indigo-400/15 p-1.5 rounded-lg">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-neutral-900 dark:text-white text-xs sm:text-sm uppercase tracking-wide">
              Recomendación Diaria de la IA
            </h3>
            <p className="text-[10px] text-neutral-400 dark:text-slate-400 font-medium">
              Sugerencia inteligente basada en tu historial de postulaciones y mercado laboral
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchDailyRecommendation(true)}
          disabled={loading}
          className="p-1.5 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Actualizar recomendación"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && (
        <div className="py-10 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-100 border-t-indigo-600 dark:border-slate-800 dark:border-t-indigo-400 rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-neutral-500 dark:text-slate-400 font-semibold">Consultando tendencias de mercado con Gemini...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-3.5 rounded-xl border border-red-100 dark:border-red-900/40 text-xs flex gap-2.5 items-start">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Error al conectar con la IA:</span>
            <p className="font-medium text-[11px] leading-relaxed opacity-90">{error}</p>
            <button 
              onClick={() => fetchDailyRecommendation()} 
              className="mt-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 underline"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {!loading && !error && recommendation && (
        <div className="space-y-4">
          {/* Header Row with Badge & Completion */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${theme.bgColor}`}>
              {theme.icon}
              {theme.label}
            </span>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 px-2 py-1 rounded-full text-[10px] font-bold">
                <Check className="w-3 h-3" /> completada hoy (+30 XP)
              </span>
            )}
          </div>

          {/* Action and Reasoning */}
          <div className="space-y-2">
            <h4 className="text-sm font-black text-neutral-900 dark:text-white leading-snug">
              {recommendation.title}
            </h4>
            <div className="bg-neutral-50/50 dark:bg-slate-800/40 border border-neutral-100 dark:border-slate-800/60 rounded-xl p-3">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-0.5">Acción Recomendada:</span>
              <p className="text-xs font-bold text-neutral-800 dark:text-slate-200 leading-normal mb-2">
                {recommendation.action}
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-slate-400 leading-relaxed font-medium">
                {recommendation.reasoning}
              </p>
            </div>
          </div>

          {/* Specific Instruction Section */}
          <div className="space-y-1.5 border-t border-neutral-100 dark:border-slate-800 pt-3">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 dark:text-slate-500 block">
              ¿Cómo hacerlo exactamente?
            </span>
            <div className="bg-indigo-50/25 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/30 rounded-xl p-3 font-sans">
              <p className="text-xs text-neutral-700 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-line">
                {recommendation.specificInstruction}
              </p>
            </div>
          </div>

          {/* Market Trend Badge */}
          {recommendation.marketTrend && (
            <div className="flex items-start gap-1.5 bg-slate-50 dark:bg-slate-800/25 border border-slate-100 dark:border-slate-800 p-2.5 rounded-xl">
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-neutral-500 dark:text-slate-400 font-medium leading-relaxed">
                <span className="font-bold text-neutral-700 dark:text-slate-300">Tendencia Laboral:</span> {recommendation.marketTrend}
              </p>
            </div>
          )}

          {/* Complete Action Button */}
          {!isCompleted && (
            <button
              onClick={handleCompleteAction}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Marcar como Completada (+30 XP)
            </button>
          )}
        </div>
      )}

      {/* Floating XP Gain Animation */}
      <AnimatePresence>
        {showXpGain && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: -40, scale: 1.1 }}
            exit={{ opacity: 0, y: -80 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-full font-black text-xs shadow-lg flex items-center gap-1.5 border border-indigo-400/30">
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              <span>¡Completado! +30 XP ganados</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
