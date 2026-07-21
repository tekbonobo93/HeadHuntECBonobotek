import React, { useState, useEffect } from "react";
import { 
  Target, 
  Trophy, 
  CheckCircle2, 
  Sparkles, 
  Plus, 
  Calendar, 
  RefreshCw, 
  Award, 
  Info, 
  Settings, 
  Check, 
  Trash2, 
  RotateCcw, 
  PlusCircle
} from "lucide-react";
import { Candidacy } from "../types";

export interface CustomWeeklyGoal {
  id: string;
  title: string;
  target: number;
  current: number;
  type: "postulaciones" | "manual";
  claimed: boolean;
}

interface WeeklyGoalsProps {
  candidacies: Candidacy[];
  onAwardXp: (amount: number, reason: string) => void;
  isDarkMode?: boolean;
}

const PRESET_GOALS = [
  { title: "Postular a empleos interesantes", target: 5, type: "postulaciones" as const },
  { title: "Contactar reclutadores en LinkedIn", target: 3, type: "manual" as const },
  { title: "Resolver retos de código", target: 4, type: "manual" as const },
  { title: "Estudiar tecnologías o repasar teoría", target: 5, type: "manual" as const },
  { title: "Mejorar portfolio o perfil de GitHub", target: 2, type: "manual" as const },
  { title: "Practicar respuestas de entrevistas", target: 3, type: "manual" as const },
];

export default function WeeklyGoals({ candidacies, onAwardXp, isDarkMode }: WeeklyGoalsProps) {
  const [goals, setGoals] = useState<CustomWeeklyGoal[]>(() => {
    const saved = localStorage.getItem("talentomatch_custom_weekly_goals");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below if parser fails
      }
    }
    return [
      {
        id: "goal-postular",
        title: "Postular a empleos interesantes",
        target: 5,
        current: 0,
        type: "postulaciones",
        claimed: false
      },
      {
        id: "goal-linkedin",
        title: "Contactar reclutadores en LinkedIn",
        target: 3,
        current: 0,
        type: "manual",
        claimed: false
      },
      {
        id: "goal-entrevista",
        title: "Practicar respuestas de entrevistas",
        target: 2,
        current: 0,
        type: "manual",
        claimed: false
      }
    ];
  });

  const [cycleStartDate, setCycleStartDate] = useState<string>(() => {
    const saved = localStorage.getItem("talentomatch_weekly_goal_cycle_start");
    if (saved) return saved;
    const today = new Date().toISOString();
    localStorage.setItem("talentomatch_weekly_goal_cycle_start", today);
    return today;
  });

  const [isEditing, setIsEditing] = useState(false);
  
  // States for adding a new goal
  const [newTitle, setNewTitle] = useState("");
  const [newTarget, setNewTarget] = useState(3);
  const [newType, setNewType] = useState<"postulaciones" | "manual">("manual");

  // Save goals changes
  useEffect(() => {
    localStorage.setItem("talentomatch_custom_weekly_goals", JSON.stringify(goals));
  }, [goals]);

  // Count matching candidacies created within this weekly cycle
  const getCycleCandidaciesCount = () => {
    const start = new Date(cycleStartDate).getTime();
    return candidacies.filter((c) => {
      // Must be applied/postulado or interviewed/offered/rejected (any status except 'guardado')
      if (c.status === "guardado") return false;
      
      if (c.appliedDate) {
        try {
          let dateMs = 0;
          if (c.appliedDate.includes("/")) {
            const parts = c.appliedDate.split("/");
            if (parts.length === 3) {
              const parsedDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
              dateMs = parsedDate.getTime();
            }
          } else {
            dateMs = new Date(c.appliedDate).getTime();
          }
          return dateMs >= start;
        } catch (e) {
          return true;
        }
      }
      return true;
    }).length;
  };

  const appCount = getCycleCandidaciesCount();

  // Calculate days remaining in the 7-day cycle
  const getDaysRemaining = () => {
    const start = new Date(cycleStartDate).getTime();
    const now = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.ceil((start + 7 * oneDay - now) / oneDay);
    return Math.max(0, diffDays);
  };

  const daysLeft = getDaysRemaining();

  // Reset the weekly cycle
  const handleResetCycle = () => {
    if (window.confirm("¿Estás seguro de que deseas iniciar un nuevo ciclo semanal? Se reiniciará el progreso de tus metas actuales pero mantendrás su configuración.")) {
      const today = new Date().toISOString();
      setCycleStartDate(today);
      setGoals(prev => prev.map(g => ({
        ...g,
        current: 0,
        claimed: false
      })));
      localStorage.setItem("talentomatch_weekly_goal_cycle_start", today);
    }
  };

  // Reset to original default configuration
  const handleRestoreDefaults = () => {
    if (window.confirm("¿Deseas restaurar las metas predeterminadas? Se perderán las metas personalizadas que hayas creado.")) {
      setGoals([
        {
          id: "goal-postular",
          title: "Postular a empleos interesantes",
          target: 5,
          current: 0,
          type: "postulaciones",
          claimed: false
        },
        {
          id: "goal-linkedin",
          title: "Contactar reclutadores en LinkedIn",
          target: 3,
          current: 0,
          type: "manual",
          claimed: false
        },
        {
          id: "goal-entrevista",
          title: "Practicar respuestas de entrevistas",
          target: 2,
          current: 0,
          type: "manual",
          claimed: false
        }
      ]);
    }
  };

  // Add custom goal
  const handleAddCustomGoal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    const newGoal: CustomWeeklyGoal = {
      id: `goal-custom-${Date.now()}`,
      title: newTitle.trim(),
      target: Math.max(1, newTarget),
      current: 0,
      type: newType,
      claimed: false
    };

    setGoals(prev => [...prev, newGoal]);
    setNewTitle("");
    setNewTarget(3);
  };

  // Add goal from preset
  const handleAddPreset = (preset: typeof PRESET_GOALS[number]) => {
    const isDuplicate = goals.some(g => g.title.toLowerCase() === preset.title.toLowerCase());
    if (isDuplicate) {
      alert("Ya tienes una meta configurada con ese mismo título.");
      return;
    }

    const newGoal: CustomWeeklyGoal = {
      id: `goal-preset-${Date.now()}`,
      title: preset.title,
      target: preset.target,
      current: 0,
      type: preset.type,
      claimed: false
    };

    setGoals(prev => [...prev, newGoal]);
  };

  // Delete goal
  const handleDeleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  // Update inline properties
  const handleUpdateGoalField = (id: string, field: keyof CustomWeeklyGoal, value: any) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== id) return g;
      const updated = { ...g, [field]: value };
      // Reset claimed state if target or type changes to prevent double rewards
      if (field === "target" && g.claimed && value !== g.target) {
        updated.claimed = false;
      }
      return updated;
    }));
  };

  // Manual log increments
  const handleIncrement = (id: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== id || g.type !== "manual") return g;
      const newCurrent = g.current + 1;
      return { ...g, current: newCurrent };
    }));
  };

  const handleDecrement = (id: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== id || g.type !== "manual") return g;
      const newCurrent = Math.max(0, g.current - 1);
      return { ...g, current: newCurrent };
    }));
  };

  // Claim goal reward
  const handleClaimReward = (goal: CustomWeeklyGoal) => {
    if (goal.claimed) return;
    
    const xpReward = goal.target * 30;
    onAwardXp(xpReward, `🏆 ¡Completaste tu meta semanal de "${goal.title}"!`);
    
    setGoals(prev => prev.map(g => {
      if (g.id === goal.id) {
        return { ...g, claimed: true };
      }
      return g;
    }));
  };

  // Helpers to fetch current status of a goal
  const getGoalCurrent = (g: CustomWeeklyGoal) => {
    return g.type === "postulaciones" ? appCount : g.current;
  };

  const isGoalCompleted = (g: CustomWeeklyGoal) => {
    return getGoalCurrent(g) >= g.target;
  };

  // Total goals progress stats
  const totalGoalsCount = goals.length;
  const completedGoalsCount = goals.filter(g => isGoalCompleted(g)).length;
  const overallProgressPercent = totalGoalsCount > 0 
    ? Math.round((completedGoalsCount / totalGoalsCount) * 100) 
    : 0;

  return (
    <div id="weekly-goals-tracker-container" className="bg-white dark:bg-slate-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-sm space-y-5 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-neutral-800 dark:text-neutral-100 uppercase tracking-wider flex items-center gap-1.5">
              Tus Objetivos Semanales
              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/85 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full normal-case tracking-normal">
                {completedGoalsCount}/{totalGoalsCount} completados
              </span>
            </h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">Define tu propia estrategia y gana XP al cumplir cada meta</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-[10px] bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
            <Calendar className="w-3 h-3 text-indigo-500" /> Faltan {daysLeft} días
          </span>
          
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
              isEditing 
                ? "bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 shadow-xs"
                : "bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-neutral-250 dark:border-neutral-700"
            }`}
            title={isEditing ? "Ver progreso" : "Personalizar objetivos"}
          >
            {isEditing ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Guardar y Salir</span>
              </>
            ) : (
              <>
                <Settings className="w-3.5 h-3.5" />
                <span>Personalizar</span>
              </>
            )}
          </button>

          <button
            onClick={handleResetCycle}
            className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer border-none bg-transparent shrink-0"
            title="Reiniciar ciclo semanal"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Panel layout */}
      {isEditing ? (
        /* EDITING MODE: Customizable Form and Presets */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Col: Add custom goal & Presets list */}
            <div className="lg:col-span-5 space-y-4">
              {/* Custom Goal Creator Form */}
              <div className="bg-neutral-50/70 dark:bg-slate-900/40 border border-neutral-200/50 dark:border-neutral-800 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-black text-neutral-700 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1">
                  <PlusCircle className="w-4 h-4 text-indigo-500" />
                  Nueva Meta Personalizada
                </h4>
                <form onSubmit={handleAddCustomGoal} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase">Título de la meta:</label>
                    <input
                      type="text"
                      placeholder="Ej. Resolver 5 retos de código..."
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg p-2 bg-white dark:bg-slate-950 focus:outline-none focus:border-indigo-500 font-medium text-neutral-800 dark:text-neutral-100"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase">Cantidad objetivo:</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={newTarget}
                        onChange={(e) => setNewTarget(parseInt(e.target.value, 10) || 1)}
                        className="w-full text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg p-2 bg-white dark:bg-slate-950 focus:outline-none focus:border-indigo-500 font-medium text-neutral-800 dark:text-neutral-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase">Seguimiento:</label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value as "postulaciones" | "manual")}
                        className="w-full text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg p-2 bg-white dark:bg-slate-950 focus:outline-none focus:border-indigo-500 font-bold text-neutral-700 dark:text-neutral-300"
                      >
                        <option value="manual">Incremento manual</option>
                        <option value="postulaciones">Tracker automático</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!newTitle.trim()}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    Añadir Meta
                  </button>
                </form>
              </div>

              {/* Preset Goals List */}
              <div className="bg-neutral-50/30 dark:bg-slate-900/10 border border-neutral-200/40 dark:border-neutral-800/40 p-4 rounded-xl space-y-2.5">
                <h4 className="text-xs font-black text-neutral-700 dark:text-neutral-200 uppercase tracking-wider">
                  🎯 Ideas y Sugerencias rápidas
                </h4>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Haz clic para añadir objetivos recomendados de inmediato:</p>
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {PRESET_GOALS.map((preset, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleAddPreset(preset)}
                      className="w-full text-left p-2 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-neutral-150 dark:hover:border-neutral-800 rounded-lg text-xs flex items-center justify-between group transition-all"
                    >
                      <div className="flex items-center gap-2 pr-2">
                        <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded-md shrink-0">
                          {preset.target}x
                        </span>
                        <span className="font-medium text-neutral-700 dark:text-neutral-300 line-clamp-1">{preset.title}</span>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-neutral-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Col: Active goals list to edit inline */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-neutral-700 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1">
                  🛠️ Administrar Objetivos Activos ({goals.length})
                </h4>
                {goals.length > 0 && (
                  <button
                    onClick={handleRestoreDefaults}
                    type="button"
                    className="text-[10px] text-red-500 hover:text-red-600 dark:text-red-400 font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restaurar por defecto
                  </button>
                )}
              </div>

              {goals.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-slate-900/30">
                  <Target className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold italic">No tienes metas configuradas.</p>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">Añade una personalizada o selecciona una de las sugerencias.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {goals.map((goal) => (
                    <div key={goal.id} className="bg-white dark:bg-slate-900 border border-neutral-250 dark:border-neutral-800 p-3 rounded-xl flex items-center gap-3 shadow-xs">
                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all cursor-pointer"
                        title="Eliminar meta"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>

                      {/* Editing Fields Row */}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2">
                        <div className="md:col-span-7">
                          <input
                            type="text"
                            value={goal.title}
                            onChange={(e) => handleUpdateGoalField(goal.id, "title", e.target.value)}
                            className="w-full text-xs border border-neutral-150 dark:border-neutral-800 rounded-lg p-1.5 bg-neutral-50/40 dark:bg-slate-950 font-bold text-neutral-850 dark:text-neutral-200"
                            placeholder="Nombre del objetivo..."
                          />
                        </div>
                        <div className="md:col-span-2 flex items-center gap-1.5">
                          <span className="text-[9px] font-bold text-neutral-400 uppercase hidden md:inline">Meta:</span>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={goal.target}
                            onChange={(e) => handleUpdateGoalField(goal.id, "target", parseInt(e.target.value, 10) || 1)}
                            className="w-full text-xs border border-neutral-150 dark:border-neutral-800 rounded-lg p-1.5 bg-neutral-50/40 dark:bg-slate-950 font-black text-center text-neutral-800 dark:text-neutral-200"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <select
                            value={goal.type}
                            onChange={(e) => handleUpdateGoalField(goal.id, "type", e.target.value)}
                            className="w-full text-xs border border-neutral-150 dark:border-neutral-800 rounded-lg p-1.5 bg-neutral-50/40 dark:bg-slate-950 font-semibold text-neutral-600 dark:text-neutral-400"
                          >
                            <option value="manual">Manual</option>
                            <option value="postulaciones">Tracker</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* VIEWING MODE: Real-time progress tracker list */
        <div className="space-y-5">
          {/* Progress dashboard summary */}
          {goals.length > 0 && (
            <div className="bg-indigo-50/35 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/30 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-0.5">Rendimiento Semanal</span>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 font-semibold">
                  Has completado <strong className="text-neutral-900 dark:text-neutral-100 font-extrabold">{completedGoalsCount} de {totalGoalsCount}</strong> metas esta semana.
                </p>
              </div>
              <div className="flex items-center gap-3 min-w-[200px] flex-1 md:flex-initial">
                <div className="w-full bg-neutral-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-500 ease-out rounded-full" 
                    style={{ width: `${overallProgressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 shrink-0">{overallProgressPercent}%</span>
              </div>
            </div>
          )}

          {goals.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/30 dark:bg-slate-900/10">
              <Target className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-bold italic">No tienes metas configuradas para esta semana.</p>
              <button
                onClick={() => setIsEditing(true)}
                type="button"
                className="mt-3 inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold px-3 py-1.5 rounded-lg border border-indigo-100/40 text-xs cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Configurar tus Metas
              </button>
            </div>
          ) : (
            /* Custom Goals Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((goal) => {
                const current = getGoalCurrent(goal);
                const isCompleted = current >= goal.target;
                const percent = Math.min(100, Math.round((current / goal.target) * 100));

                return (
                  <div 
                    key={goal.id} 
                    className={`border p-4 rounded-xl flex flex-col justify-between gap-3.5 shadow-xs transition-all relative ${
                      isCompleted 
                        ? "bg-emerald-50/15 dark:bg-emerald-950/5 border-emerald-200/80 dark:border-emerald-900/30" 
                        : "bg-white dark:bg-slate-900 border-neutral-200 dark:border-neutral-850"
                    }`}
                  >
                    <div>
                      {/* Top status & type label */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          goal.type === "postulaciones" 
                            ? "bg-sky-50 dark:bg-sky-950/35 text-sky-700 dark:text-sky-300 border border-sky-100/65 dark:border-sky-900/20"
                            : "bg-purple-50 dark:bg-purple-950/35 text-purple-700 dark:text-purple-300 border border-purple-100/65 dark:border-purple-900/20"
                        }`}>
                          {goal.type === "postulaciones" ? "Auto-tracker" : "Log manual"}
                        </span>
                        
                        <span className={`text-[10px] font-black flex items-center gap-1 ${
                          isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400"
                        }`}>
                          {current} / {goal.target}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 mt-2 leading-snug">
                        {goal.title}
                      </h4>

                      {/* Custom indicator details */}
                      {goal.type === "postulaciones" && (
                        <p className="text-[9px] text-neutral-400 dark:text-neutral-500 mt-0.5 flex items-center gap-1">
                          <Info className="w-2.5 h-2.5 shrink-0" />
                          Progreso detectado de candidaturas semanales ({appCount})
                        </p>
                      )}
                    </div>

                    {/* Progress Bar & Manual Logger controls */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="w-full bg-neutral-100 dark:bg-slate-850 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ease-out rounded-full ${
                              isCompleted ? "bg-emerald-500" : "bg-indigo-600 dark:bg-indigo-500"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Action trigger: manual controls or claim reward button */}
                      <div className="flex items-center justify-between pt-1 gap-2">
                        {/* Incrementor/Decrementor for Manual Tracker */}
                        {goal.type === "manual" && !isCompleted ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDecrement(goal.id)}
                              disabled={goal.current <= 0}
                              className="px-2 py-1 bg-neutral-100 hover:bg-neutral-250 dark:bg-slate-800 dark:hover:bg-slate-700 text-neutral-600 dark:text-neutral-300 disabled:opacity-30 rounded-lg text-xs font-black transition-all cursor-pointer select-none"
                            >
                              -1
                            </button>
                            <button
                              type="button"
                              onClick={() => handleIncrement(goal.id)}
                              className="px-3 py-1 bg-white hover:bg-neutral-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-indigo-600 dark:text-indigo-400 border border-neutral-200 dark:border-neutral-750 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer select-none"
                            >
                              <Plus className="w-3.5 h-3.5 shrink-0" />
                              Registrar
                            </button>
                          </div>
                        ) : (
                          <div className="w-2" /> // spacer
                        )}

                        {/* Claim Status block */}
                        <div>
                          {isCompleted ? (
                            goal.claimed ? (
                              <div className="text-[10px] bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold px-2.5 py-1 rounded-lg border border-emerald-200/50 dark:border-emerald-900/30 flex items-center gap-1 select-none">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                Reclamado (+{goal.target * 30} XP)
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleClaimReward(goal)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black transition-all shadow-md hover:scale-[1.03] flex items-center gap-1 cursor-pointer animate-pulse"
                              >
                                <Trophy className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
                                Reclamar +{goal.target * 30} XP
                              </button>
                            )
                          ) : (
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">
                              Recompensa: +{goal.target * 30} XP
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
