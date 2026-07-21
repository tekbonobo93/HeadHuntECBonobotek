import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, GraduationCap, Award, BookOpen, Search, RefreshCw, AlertCircle, 
  Bot, Send, CheckCircle2, RotateCcw, MessageSquareText, ChevronDown, ChevronUp, 
  User, Trash2, HelpCircle, Trophy, Target, ChevronRight, Square, CheckSquare,
  PlusCircle, Zap, Lock, Flame, Shield, Star, DollarSign, TrendingUp, BarChart2, ExternalLink,
  Copy, FileText, Check, Settings
} from "lucide-react";
import { AIRecommendation, UserProfile, Candidacy, CareerGoal, QuizQuestion } from "../types";

interface AIInsightsProps {
  profile: UserProfile;
  candidacies: Candidacy[];
}

interface ChatMessage {
  role: 'interviewer' | 'candidate';
  text: string;
}

interface InterviewFeedback {
  score: number;
  strengths: string[];
  improvements: string[];
  suggestedAnswers: string[];
}

const BADGES = [
  {
    id: "primer_paso",
    title: "Primer Paso",
    description: "Has adoptado tu primera meta de desarrollo profesional.",
    category: "general" as const,
    xpReward: 50,
    conditionText: "Adopta 1 meta de desarrollo",
    iconName: "Target"
  },
  {
    id: "candidato_preparado",
    title: "Candidato Preparado",
    description: "Has completado todos los pasos de acción en una meta.",
    category: "cv" as const,
    xpReward: 100,
    conditionText: "Completa todos los pasos de una meta",
    iconName: "CheckCircle2"
  },
  {
    id: "maestro_teorico",
    title: "Maestro Teórico",
    description: "Has aprobado un quiz de validación de la IA.",
    category: "quiz" as const,
    xpReward: 150,
    conditionText: "Aprueba 1 quiz de validación (>= 67%)",
    iconName: "GraduationCap"
  },
  {
    id: "perfeccionista",
    title: "Perfeccionista Conceptual",
    description: "Aprobaste un quiz de validación con una puntuación perfecta del 100%.",
    category: "quiz" as const,
    xpReward: 200,
    conditionText: "Consigue 100% en cualquier quiz",
    iconName: "Award"
  },
  {
    id: "experto_entrevistas",
    title: "Experto en Entrevistas",
    description: "Completaste una simulación de entrevista con feedback detallado de la IA.",
    category: "interview" as const,
    xpReward: 250,
    conditionText: "Completa 1 simulacro de entrevista completo",
    iconName: "Bot"
  },
  {
    id: "imparable",
    title: "Profesional Imparable",
    description: "Has completado al menos 3 metas de aprendizaje completamente.",
    category: "general" as const,
    xpReward: 300,
    conditionText: "Completa 3 metas de aprendizaje",
    iconName: "Trophy"
  }
];

export default function AIInsights({ profile, candidacies }: AIInsightsProps) {
  // Tabs: 'recommendations' | 'interview' | 'achievements' | 'salary' | 'cover-letter'
  const [activeTab, setActiveTab] = useState<'recommendations' | 'interview' | 'achievements' | 'salary' | 'cover-letter'>('recommendations');

  // Cover letter generator states
  const [clSelectedJobId, setClSelectedJobId] = useState<string>("manual");
  const [clManualJobTitle, setClManualJobTitle] = useState<string>("");
  const [clManualCompany, setClManualCompany] = useState<string>("");
  const [clManualJobDesc, setClManualJobDesc] = useState<string>("");
  const [clTone, setClTone] = useState<string>("persuasivo");
  const [clGeneratedText, setClGeneratedText] = useState<string>("");
  const [clLoading, setClLoading] = useState<boolean>(false);
  const [clError, setClError] = useState<string | null>(null);
  const [clCopied, setClCopied] = useState<boolean>(false);

  // Salary comparison state
  const [salaryData, setSalaryData] = useState<any | null>(null);
  const [salaryLoading, setSalaryLoading] = useState<boolean>(false);
  const [salaryError, setSalaryError] = useState<string | null>(null);

  // Gamification state with functional initializers
  const [userXp, setUserXp] = useState<number>(() => {
    const stored = localStorage.getItem("ai_career_xp");
    return stored ? parseInt(stored, 10) : 0;
  });

  const [unlockedBadges, setUnlockedBadges] = useState<string[]>(() => {
    const stored = localStorage.getItem("ai_unlocked_badges");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [completedInterviewsCount, setCompletedInterviewsCount] = useState<number>(() => {
    const stored = localStorage.getItem("ai_completed_interviews_count");
    return stored ? parseInt(stored, 10) : 0;
  });

  const [xpHistory, setXpHistory] = useState<{ id: string; text: string; xp: number; date: string }[]>(() => {
    const stored = localStorage.getItem("ai_xp_history");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [newlyUnlockedBadge, setNewlyUnlockedBadge] = useState<typeof BADGES[0] | null>(null);

  // Recommendation State
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [recsError, setRecsError] = useState<string | null>(null);

  // Career Goals (Metas) State
  const [goals, setGoals] = useState<CareerGoal[]>([]);

  // Quiz Mode State
  const [activeQuizGoal, setActiveQuizGoal] = useState<CareerGoal | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [isQuestionAnswered, setIsQuestionAnswered] = useState<boolean>(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState<number>(0);
  const [quizLoading, setQuizLoading] = useState<boolean>(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  // Interview Simulation State
  const [selectedCandidacyId, setSelectedCandidacyId] = useState<string>("");
  const [interviewStatus, setInterviewStatus] = useState<'idle' | 'starting' | 'chatting' | 'feedback'>('idle');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userResponseText, setUserResponseText] = useState("");
  const [isInterviewLoading, setIsInterviewLoading] = useState(false);
  const [interviewError, setInterviewError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [expandedAnswers, setExpandedAnswers] = useState<boolean>(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Gamification helper functions
  const addXpHistoryItem = (text: string, xpValue: number) => {
    const newItem = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      xp: xpValue,
      date: new Date().toLocaleDateString("es-ES")
    };
    setXpHistory(prev => {
      const updatedHistory = [newItem, ...prev].slice(0, 50);
      localStorage.setItem("ai_xp_history", JSON.stringify(updatedHistory));
      return updatedHistory;
    });
  };

  const awardXp = (amount: number, reason: string) => {
    setUserXp(prev => {
      const newXp = Math.max(0, prev + amount);
      localStorage.setItem("ai_career_xp", newXp.toString());
      return newXp;
    });
    addXpHistoryItem(reason, amount);
  };

  const getLevelInfo = (xp: number) => {
    if (xp < 150) {
      return {
        level: 1,
        title: "Aprendiz de Carrera",
        xpInLevel: xp,
        xpForNextLevel: 150,
        progressPercent: Math.round((xp / 150) * 100),
        color: "from-blue-500 to-indigo-500"
      };
    } else if (xp < 400) {
      const levelXp = xp - 150;
      return {
        level: 2,
        title: "Postulante Activo",
        xpInLevel: levelXp,
        xpForNextLevel: 250,
        progressPercent: Math.round((levelXp / 250) * 100),
        color: "from-indigo-500 to-purple-500"
      };
    } else if (xp < 800) {
      const levelXp = xp - 400;
      return {
        level: 3,
        title: "Candidato Competente",
        xpInLevel: levelXp,
        xpForNextLevel: 400,
        progressPercent: Math.round((levelXp / 400) * 100),
        color: "from-purple-500 to-pink-500"
      };
    } else if (xp < 1500) {
      const levelXp = xp - 800;
      return {
        level: 4,
        title: "Profesional Destacado",
        xpInLevel: levelXp,
        xpForNextLevel: 700,
        progressPercent: Math.round((levelXp / 700) * 100),
        color: "from-pink-500 to-amber-500"
      };
    } else {
      return {
        level: 5,
        title: "Experto Imparable",
        xpInLevel: xp - 1500,
        xpForNextLevel: 100000,
        progressPercent: 100,
        color: "from-amber-500 to-emerald-500"
      };
    }
  };

  const checkAndUnlockBadges = (currentGoals: CareerGoal[], currentInterviews: number) => {
    const badgesToUnlock: string[] = [];
    const currentUnlocked = [...unlockedBadges];

    // Badge 1: primer_paso -> Adopta 1 meta
    if (currentGoals.length > 0 && !currentUnlocked.includes("primer_paso")) {
      badgesToUnlock.push("primer_paso");
    }

    // Badge 2: candidato_preparado -> Completa todos los pasos de 1 meta
    const hasCompletedGoal = currentGoals.some(g => g.actionableSteps.length > 0 && g.actionableSteps.every(s => s.completed));
    if (hasCompletedGoal && !currentUnlocked.includes("candidato_preparado")) {
      badgesToUnlock.push("candidato_preparado");
    }

    // Badge 3: maestro_teorico -> Aprueba 1 quiz (quizPassed === true)
    const hasPassedQuiz = currentGoals.some(g => g.quizPassed);
    if (hasPassedQuiz && !currentUnlocked.includes("maestro_teorico")) {
      badgesToUnlock.push("maestro_teorico");
    }

    // Badge 4: perfeccionista -> Quiz con 100%
    const hasPerfectQuiz = currentGoals.some(g => g.quizScore === 100);
    if (hasPerfectQuiz && !currentUnlocked.includes("perfeccionista")) {
      badgesToUnlock.push("perfeccionista");
    }

    // Badge 5: experto_entrevistas -> Completa 1 entrevista
    if (currentInterviews > 0 && !currentUnlocked.includes("experto_entrevistas")) {
      badgesToUnlock.push("experto_entrevistas");
    }

    // Badge 6: imparable -> Completa 3 metas
    const completedGoalsCount = currentGoals.filter(g => g.actionableSteps.length > 0 && g.actionableSteps.every(s => s.completed)).length;
    if (completedGoalsCount >= 3 && !currentUnlocked.includes("imparable")) {
      badgesToUnlock.push("imparable");
    }

    if (badgesToUnlock.length > 0) {
      const updated = [...currentUnlocked, ...badgesToUnlock];
      setUnlockedBadges(updated);
      localStorage.setItem("ai_unlocked_badges", JSON.stringify(updated));

      // Award XP for each badge unlocked
      badgesToUnlock.forEach(badgeId => {
        const badge = BADGES.find(b => b.id === badgeId);
        if (badge) {
          // Wrap in setTimeout to avoid React state dispatch cascades during rendering/effects
          setTimeout(() => {
            awardXp(badge.xpReward, `Desbloqueaste insignia: ${badge.title}`);
            setNewlyUnlockedBadge(badge);
          }, 0);
        }
      });
    }
  };

  // Run badges check on goals/interviews changes
  useEffect(() => {
    if (goals.length > 0 || completedInterviewsCount > 0) {
      checkAndUnlockBadges(goals, completedInterviewsCount);
    }
  }, [goals, completedInterviewsCount]);

  // Sync XP and achievements with other components (like DailyRecommendation on the dashboard)
  useEffect(() => {
    const handleSync = () => {
      const storedXp = localStorage.getItem("ai_career_xp");
      if (storedXp) {
        setUserXp(parseInt(storedXp, 10));
      }
      const storedHistory = localStorage.getItem("ai_xp_history");
      if (storedHistory) {
        try {
          setXpHistory(JSON.parse(storedHistory));
        } catch (e) {}
      }
      const storedBadges = localStorage.getItem("ai_unlocked_badges");
      if (storedBadges) {
        try {
          setUnlockedBadges(JSON.parse(storedBadges));
        } catch (e) {}
      }
    };

    window.addEventListener("xp-updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("xp-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // Load goals from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("ai_career_goals");
    if (stored) {
      try {
        setGoals(JSON.parse(stored));
      } catch (err) {
        console.error("Error al cargar metas desde localStorage", err);
      }
    }
  }, []);

  const handleGenerateCoverLetter = async () => {
    setClLoading(true);
    setClError(null);
    setClCopied(false);

    let jobTitle = clManualJobTitle;
    let company = clManualCompany;
    let jobDescription = clManualJobDesc;

    if (clSelectedJobId !== "manual") {
      const selectedJob = candidacies.find(c => c.id === clSelectedJobId);
      if (selectedJob) {
        jobTitle = selectedJob.jobTitle;
        company = selectedJob.company;
        jobDescription = selectedJob.notes || `Postulación al puesto de ${selectedJob.jobTitle} en ${selectedJob.company}`;
      }
    }

    if (!jobTitle.trim()) {
      setClError("Por favor, ingresa el título del puesto.");
      setClLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/jobs/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          jobTitle,
          company,
          jobDescription,
          tone: clTone
        })
      });

      if (!response.ok) {
        throw new Error("No se pudo conectar con el servicio de generación de cartas.");
      }

      const data = await response.json();
      setClGeneratedText(data.coverLetter || "");
      
      // Award XP for creating a Cover Letter with AI
      awardXp(100, `Carta de Presentación generada para ${jobTitle} en ${company || "Empresa"}`);
    } catch (err: any) {
      console.error(err);
      setClError(err.message || "Error al conectar con el servicio de IA.");
    } finally {
      setClLoading(false);
    }
  };

  const handleCopyCoverLetter = () => {
    if (!clGeneratedText) return;
    navigator.clipboard.writeText(clGeneratedText);
    setClCopied(true);
    setTimeout(() => {
      setClCopied(false);
    }, 2000);
  };

  const saveGoals = (updatedGoals: CareerGoal[]) => {
    setGoals(updatedGoals);
    localStorage.setItem("ai_career_goals", JSON.stringify(updatedGoals));
  };

  const handleAdoptGoal = (rec: AIRecommendation) => {
    if (goals.some(g => g.title === rec.title)) return;
    const newGoal: CareerGoal = {
      id: Math.random().toString(36).substring(2, 9),
      title: rec.title,
      category: rec.category,
      description: rec.description,
      actionableSteps: rec.actionableSteps.map(step => ({ text: step, completed: false })),
      quizPassed: false,
      dateAdopted: new Date().toLocaleDateString("es-ES")
    };
    saveGoals([...goals, newGoal]);
    awardXp(10, `Adoptaste la meta: ${rec.title}`);
  };

  const handleAbandonGoal = (goalId: string) => {
    if (window.confirm("¿Estás seguro de que deseas abandonar esta meta de aprendizaje? Perderás tu progreso actual.")) {
      const targetGoal = goals.find(g => g.id === goalId);
      saveGoals(goals.filter(g => g.id !== goalId));
      if (targetGoal) {
        awardXp(-10, `Abandonaste la meta: ${targetGoal.title}`);
      }
    }
  };

  const handleToggleStep = (goalId: string, stepIndex: number) => {
    let xpAmount = 0;
    let stepText = "";
    const updated = goals.map(g => {
      if (g.id === goalId) {
        const updatedSteps = [...g.actionableSteps];
        const isCurrentlyCompleted = updatedSteps[stepIndex].completed;
        updatedSteps[stepIndex] = {
          ...updatedSteps[stepIndex],
          completed: !isCurrentlyCompleted
        };
        xpAmount = isCurrentlyCompleted ? -20 : 20;
        stepText = updatedSteps[stepIndex].text;
        return { ...g, actionableSteps: updatedSteps };
      }
      return g;
    });
    saveGoals(updated);
    if (xpAmount !== 0) {
      awardXp(xpAmount, xpAmount > 0 ? `Completaste paso: ${stepText}` : `Desmarcaste paso: ${stepText}`);
    }
  };

  const handleStartQuiz = async (goal: CareerGoal) => {
    setActiveQuizGoal(goal);
    setQuizLoading(true);
    setQuizError(null);
    setQuizQuestions([]);
    setCurrentQuestionIdx(0);
    setSelectedOptionIdx(null);
    setIsQuestionAnswered(false);
    setCorrectAnswersCount(0);
    setQuizSubmitted(false);

    try {
      const response = await fetch("/api/goals/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: goal.title,
          description: goal.description
        })
      });

      if (!response.ok) {
        throw new Error("No se pudo conectar con el servidor para obtener las preguntas.");
      }

      const data = await response.json();
      setQuizQuestions(data.questions);
    } catch (err: any) {
      console.error(err);
      setQuizError(err.message || "Error al generar el examen de validación.");
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSelectOption = (idx: number) => {
    if (isQuestionAnswered) return;
    setSelectedOptionIdx(idx);
    setIsQuestionAnswered(true);
    const currentQuestion = quizQuestions[currentQuestionIdx];
    if (idx === currentQuestion.correctIndex) {
      setCorrectAnswersCount(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < quizQuestions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOptionIdx(null);
      setIsQuestionAnswered(false);
    } else {
      // Finish quiz
      setQuizSubmitted(true);
      const scorePercent = Math.round((correctAnswersCount / quizQuestions.length) * 100);
      const passed = correctAnswersCount >= 2; // Pass with 2/3 correct or more

      if (activeQuizGoal) {
        const updated = goals.map(g => {
          if (g.id === activeQuizGoal.id) {
            if (!g.quizPassed && passed) {
              awardXp(100, `Aprobaste examen de: ${activeQuizGoal.title} (${scorePercent}%)`);
            }
            return {
              ...g,
              quizPassed: passed,
              quizScore: scorePercent
            };
          }
          return g;
        });
        saveGoals(updated);
      }
    }
  };

  const handleResetQuiz = () => {
    setActiveQuizGoal(null);
    setQuizQuestions([]);
    setCurrentQuestionIdx(0);
    setSelectedOptionIdx(null);
    setIsQuestionAnswered(false);
    setCorrectAnswersCount(0);
    setQuizError(null);
    setQuizSubmitted(false);
  };


  // Fetch career recommendations automatically
  const fetchRecommendations = async () => {
    setIsLoadingRecs(true);
    setRecsError(null);
    try {
      const response = await fetch("/api/jobs/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          candidacies
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Error al obtener recomendaciones de IA");
      }

      const results = await response.json();
      setRecommendations(results);
    } catch (err: any) {
      console.error(err);
      setRecsError(err.message || "Error al generar recomendaciones de carrera con IA.");
    } finally {
      setIsLoadingRecs(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [profile.skills, candidacies.length]);

  const fetchSalaryComparison = async () => {
    setSalaryLoading(true);
    setSalaryError(null);
    try {
      const response = await fetch("/api/jobs/salary-comparison", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          candidacies
        })
      });

      if (!response.ok) {
        throw new Error("No se pudo obtener el análisis comparativo de salarios.");
      }

      const data = await response.json();
      setSalaryData(data);
    } catch (err: any) {
      console.error(err);
      setSalaryError(err.message || "Error al conectar con la IA para la comparativa salarial.");
    } finally {
      setSalaryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'salary' && !salaryData && !salaryLoading) {
      fetchSalaryComparison();
    }
  }, [activeTab, profile, candidacies]);

  // Scroll chat history to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, isInterviewLoading]);

  // Set default candidacy when candidacies load
  useEffect(() => {
    if (candidacies.length > 0 && !selectedCandidacyId) {
      setSelectedCandidacyId(candidacies[0].id);
    }
  }, [candidacies]);

  const getCategoryIcon = (category: AIRecommendation['category']) => {
    switch (category) {
      case "cv":
        return <Award className="w-5 h-5 text-indigo-500" />;
      case "skills":
        return <GraduationCap className="w-5 h-5 text-emerald-500" />;
      case "interview":
        return <BookOpen className="w-5 h-5 text-amber-500" />;
      case "market":
        return <Search className="w-5 h-5 text-blue-500" />;
    }
  };

  const getCategoryLabel = (category: AIRecommendation['category']) => {
    switch (category) {
      case "cv": return "Optimización de CV";
      case "skills": return "Habilidades Sugeridas";
      case "interview": return "Preparación de Entrevista";
      case "market": return "Análisis de Mercado";
    }
  };

  const getCategoryColor = (category: AIRecommendation['category']) => {
    switch (category) {
      case "cv": return "bg-indigo-50 border-indigo-100";
      case "skills": return "bg-emerald-50 border-emerald-100";
      case "interview": return "bg-amber-50 border-amber-100";
      case "market": return "bg-blue-50 border-blue-100";
    }
  };

  // Interview Actions
  const handleStartInterview = async () => {
    const selectedCand = candidacies.find(c => c.id === selectedCandidacyId);
    if (!selectedCand) {
      setInterviewError("Por favor selecciona una candidatura para iniciar.");
      return;
    }

    setIsInterviewLoading(true);
    setInterviewError(null);
    setInterviewStatus('starting');
    setChatHistory([]);
    setFeedback(null);

    try {
      const response = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          candidacy: selectedCand
        })
      });

      if (!response.ok) {
        throw new Error("No se pudo iniciar la entrevista simulada.");
      }

      const data = await response.json();
      setChatHistory([{ role: 'interviewer', text: data.question }]);
      setInterviewStatus('chatting');
    } catch (err: any) {
      console.error(err);
      setInterviewError("Error al iniciar el simulador de entrevistas: " + err.message);
      setInterviewStatus('idle');
    } finally {
      setIsInterviewLoading(false);
    }
  };

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userResponseText.trim() || isInterviewLoading) return;

    const selectedCand = candidacies.find(c => c.id === selectedCandidacyId);
    if (!selectedCand) return;

    const currentAnswer = userResponseText.trim();
    setUserResponseText("");

    // Append user message immediately
    const updatedHistory: ChatMessage[] = [
      ...chatHistory,
      { role: 'candidate', text: currentAnswer }
    ];
    setChatHistory(updatedHistory);
    setIsInterviewLoading(true);
    setInterviewError(null);

    try {
      const response = await fetch("/api/interview/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          candidacy: selectedCand,
          chatHistory: updatedHistory,
          userResponse: currentAnswer
        })
      });

      if (!response.ok) {
        throw new Error("No se pudo procesar tu respuesta.");
      }

      const data = await response.json();
      if (data.isFinished) {
        setFeedback(data.feedback);
        setInterviewStatus('feedback');
        setCompletedInterviewsCount(prev => {
          const newCount = prev + 1;
          localStorage.setItem("ai_completed_interviews_count", newCount.toString());
          return newCount;
        });
        awardXp(150, `Completaste simulación de entrevista para ${selectedCand.jobTitle}`);
      } else {
        setChatHistory(prev => [
          ...prev,
          { role: 'interviewer', text: data.nextQuestion }
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setInterviewError("Ocurrió un error al procesar tu respuesta con la IA: " + err.message);
    } finally {
      setIsInterviewLoading(false);
    }
  };

  const handleResetInterview = () => {
    setInterviewStatus('idle');
    setChatHistory([]);
    setFeedback(null);
    setUserResponseText("");
    setInterviewError(null);
  };

  const getBadgeIcon = (iconName: string, unlocked: boolean) => {
    const iconClass = `w-7 h-7 ${unlocked ? 'text-indigo-600' : 'text-slate-400 opacity-60'}`;
    switch (iconName) {
      case "Target":
        return <Target className={iconClass} />;
      case "CheckCircle2":
        return <CheckCircle2 className={iconClass} />;
      case "GraduationCap":
        return <GraduationCap className={iconClass} />;
      case "Award":
        return <Award className={iconClass} />;
      case "Bot":
        return <Bot className={iconClass} />;
      case "Trophy":
        return <Trophy className={iconClass} />;
      default:
        return <Award className={iconClass} />;
    }
  };

  const selectedCandidacy = candidacies.find(c => c.id === selectedCandidacyId);
  const lvlInfo = getLevelInfo(userXp);

  return (
    <div id="ai-insights-container" className="bg-white rounded-xl border border-neutral-200/80 p-6 shadow-sm space-y-6">
      {/* Tab bar header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-neutral-100 pb-4 gap-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
            AI Co-Pilot Career Hub
          </h2>
          <p className="text-xs text-neutral-500">
            Maximiza tus opciones de éxito combinando sugerencias estratégicas con entrenamiento práctico.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
          {/* Level Info Widget */}
          <div 
            onClick={() => setActiveTab('achievements')}
            className="flex items-center gap-2.5 bg-neutral-50 hover:bg-neutral-100/80 px-3 py-1.5 rounded-xl border border-neutral-200/60 cursor-pointer transition-all shadow-sm"
            title="Ver mis logros profesionales"
          >
            <div className={`bg-gradient-to-br ${lvlInfo.color} text-white font-black text-xs h-6 w-6 rounded-lg flex items-center justify-center shadow-sm`}>
              {lvlInfo.level}
            </div>
            <div className="flex flex-col min-w-[110px]">
              <div className="flex items-center justify-between text-[10px] font-black text-neutral-700">
                <span className="truncate max-w-[70px]">{lvlInfo.title}</span>
                <span className="text-indigo-600 ml-1">{userXp} XP</span>
              </div>
              <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden mt-0.5">
                <div className={`bg-gradient-to-r ${lvlInfo.color} h-full rounded-full transition-all duration-500`} style={{ width: `${lvlInfo.progressPercent}%` }}></div>
              </div>
            </div>
          </div>

          {/* Tab switcher buttons */}
          <div className="flex flex-wrap bg-neutral-100 p-1 rounded-xl border border-neutral-200/50 gap-0.5 sm:gap-0">
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'recommendations'
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Sugerencias
            </button>
            <button
              onClick={() => setActiveTab('interview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'interview'
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              Simulador
            </button>
            <button
              onClick={() => setActiveTab('salary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'salary'
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
              Salarios
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'achievements'
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              Logros
              {unlockedBadges.length > 0 && (
                <span className="bg-amber-500 text-white text-[9px] h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center font-black animate-bounce">
                  {unlockedBadges.length}
                </span>
              )}
            </button>
            <button
              id="cover-letter-tab-btn"
              onClick={() => setActiveTab('cover-letter')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'cover-letter'
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              Carta de Presentación
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: RECOMMENDATIONS / GOALS & QUIZ */}
      {activeTab === 'recommendations' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* INTERACTIVE QUIZ WORKSPACE */}
          {activeQuizGoal ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6">
              {/* Quiz Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-600 text-white p-2 rounded-xl">
                    <HelpCircle className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">Quiz de Validación IA</span>
                    <h3 className="font-bold text-slate-900 text-sm">{activeQuizGoal.title}</h3>
                  </div>
                </div>
                <button
                  onClick={handleResetQuiz}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg border border-slate-200 font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Salir del Examen
                </button>
              </div>

              {quizLoading && (
                <div className="py-12 text-center space-y-4">
                  <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800">Generando tu examen interactivo...</p>
                    <p className="text-[10px] text-slate-400 max-w-[340px] mx-auto leading-relaxed">
                      La IA de Gemini está redactando 3 preguntas conceptuales basadas en tu plan de estudio y perfil profesional. ¡Prepárate!
                    </p>
                  </div>
                </div>
              )}

              {quizError && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 space-y-3 text-xs">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Error de Generación: </span>
                      {quizError}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartQuiz(activeQuizGoal)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
                    >
                      Reintentar
                    </button>
                    <button
                      onClick={handleResetQuiz}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-red-700 font-bold rounded-lg border border-red-200"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {!quizLoading && !quizError && quizQuestions.length > 0 && (
                <>
                  {!quizSubmitted ? (
                    <div className="space-y-6">
                      {/* Progress header */}
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-indigo-600 uppercase tracking-wide">
                          Pregunta {currentQuestionIdx + 1} de {quizQuestions.length}
                        </span>
                        <span className="text-slate-400">
                          Aciertos: {correctAnswersCount}
                        </span>
                      </div>

                      {/* Question progress indicator bar */}
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 transition-all duration-300" 
                          style={{ width: `${((currentQuestionIdx + 1) / quizQuestions.length) * 100}%` }}
                        />
                      </div>

                      {/* Question card */}
                      <div className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-4 shadow-xs">
                        <h4 className="text-xs font-extrabold text-slate-900 leading-relaxed md:text-sm">
                          {quizQuestions[currentQuestionIdx].question}
                        </h4>

                        {/* Options list */}
                        <div className="grid grid-cols-1 gap-2.5">
                          {quizQuestions[currentQuestionIdx].options.map((option, idx) => {
                            const isCorrect = idx === quizQuestions[currentQuestionIdx].correctIndex;
                            const isSelected = idx === selectedOptionIdx;
                            
                            let buttonStyle = "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50";
                            
                            if (isQuestionAnswered) {
                              if (isCorrect) {
                                buttonStyle = "bg-emerald-50 border-emerald-500 text-emerald-800 font-bold";
                              } else if (isSelected) {
                                buttonStyle = "bg-rose-50 border-rose-400 text-rose-800 font-bold";
                              } else {
                                buttonStyle = "bg-white border-slate-100 text-slate-400 opacity-60";
                              }
                            }

                            return (
                              <button
                                key={idx}
                                disabled={isQuestionAnswered}
                                onClick={() => handleSelectOption(idx)}
                                className={`w-full text-left p-3.5 rounded-xl border text-xs font-medium transition-all flex items-start gap-2.5 ${buttonStyle} ${!isQuestionAnswered ? 'cursor-pointer active:scale-99' : ''}`}
                              >
                                <span className={`w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0 border ${
                                  isQuestionAnswered && isCorrect
                                    ? "bg-emerald-500 text-white border-emerald-500"
                                    : isQuestionAnswered && isSelected
                                    ? "bg-rose-500 text-white border-rose-500"
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                                }`}>
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="leading-tight">{option}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Pedagogical Explanation */}
                      {isQuestionAnswered && (
                        <div className="bg-amber-50/50 border border-amber-200/50 p-4 rounded-xl space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            Explicación Didáctica de la IA:
                          </p>
                          <p className="text-xs text-slate-700 font-medium leading-relaxed">
                            {quizQuestions[currentQuestionIdx].explanation}
                          </p>
                        </div>
                      )}

                      {/* Navigation button */}
                      {isQuestionAnswered && (
                        <div className="flex justify-end">
                          <button
                            onClick={handleNextQuestion}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all border border-indigo-700/50 flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <span>
                              {currentQuestionIdx < quizQuestions.length - 1 ? "Siguiente Pregunta" : "Ver Resultados"}
                            </span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* QUIZ SUBMITTED RESULTS PAGE */
                    <div className="text-center py-6 space-y-6 max-w-md mx-auto">
                      <div className="relative w-24 h-24 mx-auto">
                        {correctAnswersCount >= 2 ? (
                          <div className="w-24 h-24 bg-emerald-500 border-4 border-emerald-100 rounded-full flex items-center justify-center text-white shadow-md">
                            <Trophy className="w-12 h-12" />
                          </div>
                        ) : (
                          <div className="w-24 h-24 bg-slate-200 border-4 border-slate-100 rounded-full flex items-center justify-center text-slate-500">
                            <RotateCcw className="w-12 h-12" />
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-500">
                          {correctAnswersCount}/3 Aciertos
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-base font-bold text-slate-900 leading-tight">
                          {correctAnswersCount >= 2 
                            ? "¡Felicidades, examen aprobado! 🎉" 
                            : "Sigue estudiando... ¡tú puedes! 💪"}
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          {correctAnswersCount >= 2
                            ? `Has demostrado un gran dominio conceptual sobre la meta de "${activeQuizGoal.title}". Tu dedicación te posiciona fuerte frente a retos laborales reales.`
                            : `Obtuviste ${correctAnswersCount} aciertos de un total de 3. Para validar esta meta es ideal tener al menos 2 respuestas correctas. Repasa los puntos de acción y reintenta.`}
                        </p>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-left">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-[11px] font-bold text-slate-400 uppercase">Resumen</span>
                          <span className={`text-xs font-black ${correctAnswersCount >= 2 ? "text-emerald-600" : "text-amber-600"}`}>
                            {correctAnswersCount >= 2 ? "APROBADO" : "DEBES MEJORAR"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-bold">
                          Meta: <span className="font-medium text-slate-600">{activeQuizGoal.title}</span>
                        </p>
                        <p className="text-xs text-slate-700 font-bold">
                          Calificación: <span className="font-medium text-slate-600">{Math.round((correctAnswersCount / quizQuestions.length) * 100)}%</span>
                        </p>
                      </div>

                      <button
                        onClick={handleResetQuiz}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md cursor-pointer transition-all"
                      >
                        Volver a mis Metas
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* NORMAL DASHBOARD VIEW (METAS ACTIVAS + RECOMENDACIONES) */
            <>
              {/* SECTION: TUS METAS ACTIVAS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-indigo-600" />
                    Mis Metas de Aprendizaje y Desarrollo
                  </h3>
                  <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-100">
                    {goals.length} Activas
                  </span>
                </div>

                {goals.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-5 text-center">
                    <Target className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">Aún no has adoptado ninguna meta de desarrollo</p>
                    <p className="text-[11px] text-slate-500 max-w-[380px] mx-auto mt-1 leading-relaxed">
                      Echa un vistazo a los consejos e ideas inteligentes generados por la IA en la sección de abajo. Haz clic en **'Adoptar como Meta'** en cualquiera de ellos para trazar tu hoja de ruta interactiva.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {goals.map((goal) => {
                      const completedCount = goal.actionableSteps.filter(s => s.completed).length;
                      const totalSteps = goal.actionableSteps.length;
                      const percentCompleted = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

                      return (
                        <div 
                          key={goal.id} 
                          className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 shadow-xs transition-all ${
                            goal.quizPassed 
                              ? "bg-indigo-50/30 border-indigo-200/70 shadow-indigo-50/10" 
                              : "bg-white border-slate-200/80 hover:border-slate-300"
                          }`}
                        >
                          <div className="space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="bg-slate-100 p-2 rounded-lg border border-slate-200/50 shrink-0">
                                  {getCategoryIcon(goal.category)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-extrabold uppercase tracking-wide text-neutral-400">
                                      Adoptada el {goal.dateAdopted}
                                    </span>
                                    {goal.quizPassed && (
                                      <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                        <Trophy className="w-2.5 h-2.5" /> IA VALIDADA
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="font-bold text-slate-900 text-xs leading-tight line-clamp-1">{goal.title}</h4>
                                </div>
                              </div>
                              <button
                                onClick={() => handleAbandonGoal(goal.id)}
                                className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                                title="Abandonar Meta"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2">
                              {goal.description}
                            </p>

                            {/* Checklist */}
                            <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                              <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                                Tu plan de acción (marca tus pasos):
                              </h5>
                              <div className="space-y-1.5">
                                {goal.actionableSteps.map((step, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => handleToggleStep(goal.id, idx)}
                                    className="w-full text-left flex items-start gap-2 text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
                                  >
                                    <span className="shrink-0 mt-0.5">
                                      {step.completed ? (
                                        <CheckSquare className="w-4 h-4 text-indigo-600 fill-indigo-50" />
                                      ) : (
                                        <Square className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                                      )}
                                    </span>
                                    <span className={step.completed ? "line-through text-slate-400" : ""}>
                                      {step.text}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Footer and progress bar */}
                          <div className="space-y-3 pt-3 border-t border-slate-100">
                            {/* Progress bar info */}
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                              <span>Progreso Ruta</span>
                              <span>{completedCount}/{totalSteps} pasos ({percentCompleted}%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-600 rounded-full transition-all duration-300" 
                                style={{ width: `${percentCompleted}%` }}
                              />
                            </div>

                            {/* Quiz action row */}
                            <div className="pt-1 flex items-center justify-between gap-2">
                              {goal.quizPassed ? (
                                <div className="bg-emerald-50 text-emerald-800 border border-emerald-200/50 rounded-lg px-2.5 py-1.5 text-[10px] font-bold flex items-center gap-1.5 w-full">
                                  <Trophy className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
                                  <span>¡Masterizado! Quiz aprobado con <strong>{goal.quizScore}%</strong></span>
                                </div>
                              ) : (
                                <>
                                  {goal.quizScore !== undefined && (
                                    <span className="text-[10px] font-extrabold text-amber-600">
                                      Examen previo: {goal.quizScore}% (Mín: 67%)
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleStartQuiz(goal)}
                                    className="ml-auto px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg border border-indigo-700/50 text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-xs"
                                  >
                                    <HelpCircle className="w-3.5 h-3.5" />
                                    Evaluar Habilidad
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION: IDEAS Y SUGERENCIAS DE LA IA */}
              <div className="space-y-4 pt-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    Propuestas y Consejos de la IA
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Sugerencias personalizadas para complementar tu perfil. Selecciona las que desees adoptar como meta.
                  </p>
                </div>

                {isLoadingRecs && (
                  <div className="py-12 flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-xs text-neutral-500 font-medium animate-pulse">Buscando nuevas propuestas...</p>
                  </div>
                )}

                {recsError && (
                  <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-xs font-medium">
                    No pudimos recargar sugerencias en este momento. Intenta de nuevo más tarde.
                  </div>
                )}

                {!isLoadingRecs && !recsError && recommendations.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendations.map((rec, index) => {
                      const isAdopted = goals.some(g => g.title === rec.title);

                      return (
                        <div
                          key={index}
                          className={`rounded-xl border p-5 flex flex-col justify-between space-y-4 ${getCategoryColor(rec.category)}`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="bg-white p-2 rounded-lg border border-neutral-200/50 shadow-xs">
                                  {getCategoryIcon(rec.category)}
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                    {getCategoryLabel(rec.category)}
                                  </span>
                                  <h3 className="font-bold text-neutral-900 text-xs leading-tight">{rec.title}</h3>
                                </div>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                              {rec.description}
                            </p>
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-1.5 bg-white/70 backdrop-blur-xs rounded-lg p-2.5 border border-white/50">
                              <h4 className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                                Hoja de Ruta Propuesta
                              </h4>
                              <ul className="space-y-1">
                                {rec.actionableSteps.map((step, i) => (
                                  <li key={i} className="text-[11px] text-neutral-700 flex items-start gap-1.5 font-medium">
                                    <span className="w-3.5 h-3.5 rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                      {i + 1}
                                    </span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="flex justify-end pt-1">
                              {isAdopted ? (
                                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-extrabold px-3 py-1.5 rounded-lg border border-indigo-200 flex items-center gap-1 cursor-default">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                                  Meta Activa
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleAdoptGoal(rec)}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg border border-indigo-700/50 text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1 shadow-xs hover:shadow-sm"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                  Adoptar como Meta
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}


      {/* TAB 2: INTERVIEW SIMULATOR */}
      {activeTab === 'interview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* PROFILE COMPLETION CHECK */}
          {!profile.name && (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-3">
              <User className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700">Por favor completa tu perfil</p>
                <p className="text-[11px] text-slate-500 max-w-[320px] mx-auto leading-relaxed">
                  Necesitamos conocer tu nombre, habilidades y trayectoria para que el simulador redacte preguntas relevantes y personalizadas basadas en tu CV.
                </p>
              </div>
            </div>
          )}

          {/* NO CANDIDACIES REGISTERED */}
          {profile.name && candidacies.length === 0 && (
            <div className="p-6 bg-amber-50/50 border border-amber-100 rounded-xl text-center space-y-3">
              <MessageSquareText className="w-10 h-10 text-amber-500/80 mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-amber-900">No hay vacantes guardadas para simular</p>
                <p className="text-[11px] text-amber-700 max-w-[340px] mx-auto leading-relaxed">
                  Para realizar una entrevista simulada, primero debes guardar o postularte a alguna oferta de empleo en la sección **'Jobs'**. La IA usará los detalles de ese puesto y tu CV para entrevistarte de forma personalizada.
                </p>
              </div>
            </div>
          )}

          {profile.name && candidacies.length > 0 && (
            <>
              {/* IDLE STATE: SELECT JOB AND START */}
              {interviewStatus === 'idle' && (
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Configura tu simulación
                    </h3>
                    <p className="text-xs text-neutral-600">
                      Elige uno de tus puestos de trabajo guardados para simular una entrevista técnica y conductual.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                        Puesto de Trabajo Guardado:
                      </label>
                      <select
                        value={selectedCandidacyId}
                        onChange={(e) => setSelectedCandidacyId(e.target.value)}
                        className="w-full text-xs font-bold border border-slate-200 bg-white rounded-lg px-3 py-2.5 outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {candidacies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.jobTitle} - {c.company} ({c.status.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleStartInterview}
                      disabled={isInterviewLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-lg border border-indigo-700/50 transition-colors shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-1.5 h-[38px] active:scale-95 disabled:opacity-50"
                    >
                      <Bot className="w-4 h-4 text-indigo-200" />
                      Iniciar Simulador
                    </button>
                  </div>

                  {selectedCandidacy && (
                    <div className="mt-3 bg-white p-3.5 rounded-lg border border-slate-200/50 space-y-1">
                      <p className="text-[11px] font-extrabold text-indigo-900 block uppercase tracking-wide">
                        Detalles del Rol:
                      </p>
                      <p className="text-[11px] text-slate-700 font-bold">
                        {selectedCandidacy.jobTitle} en {selectedCandidacy.company}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed line-clamp-2">
                        {selectedCandidacy.notes ? `Notas: ${selectedCandidacy.notes}` : "Utilizaremos tu currículum cargado y las responsabilidades por defecto de este puesto para calibrar las preguntas de la IA."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ERROR STATE */}
              {interviewError && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-start gap-3 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Error en Simulador: </span>
                    {interviewError}
                    <button
                      onClick={handleResetInterview}
                      className="block mt-1 underline font-bold hover:text-red-800"
                    >
                      Volver al inicio
                    </button>
                  </div>
                </div>
              )}

              {/* STARTING LOADER */}
              {interviewStatus === 'starting' && (
                <div className="py-12 text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800">El entrevistador IA está preparando tu sesión...</p>
                    <p className="text-[10px] text-slate-400 max-w-[340px] mx-auto leading-relaxed">
                      Analizando el CV de {profile.name} y contrastándolo con el puesto de {selectedCandidacy?.jobTitle} en {selectedCandidacy?.company}...
                    </p>
                  </div>
                </div>
              )}

              {/* CHATTING STATE: ACTIVE CHAT FORUM */}
              {interviewStatus === 'chatting' && (
                <div className="border border-slate-200/90 rounded-2xl overflow-hidden flex flex-col h-[480px] bg-slate-50/50">
                  {/* Chat Header */}
                  <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                        <Bot className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400">Entrevistador Virtual IA</span>
                        <h4 className="text-xs font-bold text-slate-200 leading-tight">
                          {selectedCandidacy?.company} - {selectedCandidacy?.jobTitle}
                        </h4>
                      </div>
                    </div>
                    <button
                      onClick={handleResetInterview}
                      className="text-[10px] text-slate-400 hover:text-red-400 font-bold transition-colors cursor-pointer flex items-center gap-0.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Terminar
                    </button>
                  </div>

                  {/* Message Threads area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatHistory.map((msg, index) => {
                      const isInterviewer = msg.role === 'interviewer';
                      return (
                        <div
                          key={index}
                          className={`flex items-start gap-2.5 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                            isInterviewer ? "mr-auto" : "ml-auto flex-row-reverse"
                          }`}
                        >
                          {/* Avatar */}
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border shadow-xs ${
                            isInterviewer 
                              ? "bg-indigo-50 border-indigo-200 text-indigo-600" 
                              : "bg-white border-slate-300 text-slate-600"
                          }`}>
                            {isInterviewer ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                          </div>

                          {/* Message Bubble */}
                          <div className={`p-3 rounded-2xl text-xs font-medium leading-relaxed ${
                            isInterviewer
                              ? "bg-white border border-slate-200/90 text-slate-800 rounded-tl-none shadow-xs"
                              : "bg-indigo-600 text-white rounded-tr-none shadow-xs"
                          }`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          </div>
                        </div>
                      );
                    })}

                    {/* Pending response indicator */}
                    {isInterviewLoading && (
                      <div className="flex items-start gap-2.5 mr-auto max-w-[85%]">
                        <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
                          <Bot className="w-3.5 h-3.5 animate-pulse" />
                        </div>
                        <div className="bg-white border border-slate-200/90 text-slate-500 p-3 rounded-2xl rounded-tl-none text-xs flex items-center gap-2 font-medium">
                          <span className="flex space-x-1">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          </span>
                          <span>Entrevistador procesando respuesta...</span>
                        </div>
                      </div>
                    )}

                    <div ref={chatBottomRef} />
                  </div>

                  {/* Chat input footer form */}
                  <form 
                    onSubmit={handleSendResponse}
                    className="p-3 bg-white border-t border-slate-100 flex items-center gap-2"
                  >
                    <textarea
                      value={userResponseText}
                      onChange={(e) => setUserResponseText(e.target.value)}
                      disabled={isInterviewLoading}
                      placeholder="Redacta tu respuesta profesional aquí..."
                      className="flex-1 bg-slate-50 hover:bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:bg-white focus:border-indigo-500 resize-none h-[42px] max-h-[80px]"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendResponse(e);
                        }
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!userResponseText.trim() || isInterviewLoading}
                      className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl border border-indigo-700/50 disabled:opacity-40 transition-colors cursor-pointer flex items-center justify-center shrink-0 shadow-xs"
                      title="Enviar respuesta"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}

              {/* FEEDBACK STATE: SUMMARY REPORT CARDS */}
              {interviewStatus === 'feedback' && feedback && (
                <div className="space-y-6 animate-in zoom-in-95 duration-200">
                  {/* Performance Score banner */}
                  <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-2 text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300">Evaluación Completada</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-100 leading-tight">
                        ¡Felicidades por finalizar tu entrevista simulada!
                      </h3>
                      <p className="text-xs text-slate-300 max-w-[420px] leading-relaxed font-medium">
                        Hemos analizado tus respuestas basándonos en los requisitos del puesto de **{selectedCandidacy?.jobTitle}** y tu perfil técnico. Revisa la retroalimentación a continuación.
                      </p>
                    </div>

                    {/* Circular score gauge */}
                    <div className="relative w-24 h-24 rounded-full border-4 border-slate-800 bg-slate-950 flex flex-col items-center justify-center shrink-0">
                      <span className="text-3xl font-black text-indigo-400 leading-none">
                        {feedback.score}
                      </span>
                      <span className="text-[8px] font-black uppercase text-indigo-300 tracking-wider mt-0.5">
                        PUNTAJE
                      </span>
                    </div>
                  </div>

                  {/* Strengths & Improvements Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="bg-emerald-50/40 border border-emerald-100/80 rounded-xl p-5 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-emerald-500" />
                        Fortalezas Detectadas
                      </h4>
                      <ul className="space-y-2">
                        {feedback.strengths.map((str, idx) => (
                          <li key={idx} className="text-xs text-slate-700 flex items-start gap-2 font-medium leading-relaxed">
                            <span className="w-4 h-4 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 mt-0.5">✓</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Improvements */}
                    <div className="bg-amber-50/40 border border-amber-100/80 rounded-xl p-5 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-amber-500" />
                        Áreas de Mejora
                      </h4>
                      <ul className="space-y-2">
                        {feedback.improvements.map((imp, idx) => (
                          <li key={idx} className="text-xs text-slate-700 flex items-start gap-2 font-medium leading-relaxed">
                            <span className="w-4 h-4 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 mt-0.5">!</span>
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Suggested Answers Accordion */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedAnswers(!expandedAnswers)}
                      className="w-full px-5 py-4 bg-slate-100/60 hover:bg-slate-100 hover:text-slate-900 border-b border-slate-200/50 flex items-center justify-between transition-colors text-slate-700 cursor-pointer"
                    >
                      <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <MessageSquareText className="w-4 h-4 text-indigo-500" />
                        Guía de Respuestas Recomendadas por la IA
                      </span>
                      {expandedAnswers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {expandedAnswers && (
                      <div className="p-5 space-y-4 divide-y divide-slate-200/70">
                        {feedback.suggestedAnswers.map((answer, index) => (
                          <div key={index} className={`pt-3 first:pt-0 space-y-1.5`}>
                            <h5 className="text-[11px] font-extrabold text-indigo-950 uppercase tracking-wider">
                              Estrategia / Respuesta sugerida {index + 1}:
                            </h5>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                              {answer}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action row */}
                  <div className="flex justify-center">
                    <button
                      onClick={handleResetInterview}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border border-indigo-700/50 flex items-center gap-1.5 transition-colors shadow-xs hover:shadow-md cursor-pointer hover:scale-102 duration-150 active:scale-98"
                    >
                      <RotateCcw className="w-4 h-4 text-indigo-200" />
                      Simular Otra Entrevista
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 3: ACHIEVEMENTS & GAMIFICATION */}
      {activeTab === 'achievements' && (
        <div className="space-y-6 animate-in fade-in duration-200" id="professional-achievements-tab">
          {/* Header Dashboard Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* XP & Level Panel */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden md:col-span-2">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10">
                <Trophy className="w-40 h-40" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300">Rango de Carrera</span>
                  <h3 className="text-xl font-black">{lvlInfo.title}</h3>
                </div>
                <div className="bg-indigo-600/50 backdrop-blur-xs px-3 py-1 rounded-xl border border-indigo-500/30 text-xs font-black">
                  Nivel {lvlInfo.level}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-indigo-200">Progreso de Experiencia</span>
                  <span className="font-extrabold text-white">{userXp} XP</span>
                </div>
                <div className="w-full bg-slate-800/80 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                  <div className={`bg-gradient-to-r ${lvlInfo.color} h-full rounded-full transition-all duration-700`} style={{ width: `${lvlInfo.progressPercent}%` }}></div>
                </div>
                {lvlInfo.level < 5 ? (
                  <p className="text-[10px] text-indigo-200/80 text-right font-medium">
                    Faltan {lvlInfo.xpForNextLevel - lvlInfo.xpInLevel} XP para el nivel {lvlInfo.level + 1}
                  </p>
                ) : (
                  <p className="text-[10px] text-amber-300 text-right font-extrabold flex items-center justify-end gap-1">
                    <Flame className="w-3 h-3 animate-pulse" /> ¡Nivel Máximo Alcanzado!
                  </p>
                )}
              </div>
            </div>

            {/* Quick stats panel */}
            <div className="bg-neutral-50 border border-neutral-200/60 rounded-2xl p-5 flex flex-col justify-between gap-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-500">Métricas de Esfuerzo</span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-white rounded-xl border border-neutral-200/50">
                  <span className="block text-lg font-black text-indigo-600">{unlockedBadges.length}</span>
                  <span className="text-[9px] font-bold text-neutral-500 uppercase">Insignias</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-neutral-200/50">
                  <span className="block text-lg font-black text-emerald-600">{completedInterviewsCount}</span>
                  <span className="text-[9px] font-bold text-neutral-500 uppercase">Entrevistas</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-neutral-200/50">
                  <span className="block text-lg font-black text-amber-600">
                    {goals.filter(g => g.actionableSteps.length > 0 && g.actionableSteps.every(s => s.completed)).length}
                  </span>
                  <span className="text-[9px] font-bold text-neutral-500 uppercase">Metas OK</span>
                </div>
              </div>
              <p className="text-[10px] text-neutral-500 font-medium leading-normal text-center">
                Completa tareas del copiloto y simulaciones de entrevista para ganar más XP.
              </p>
            </div>
          </div>

          {/* Grid section of Badges & History */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Badges Grid (Left side) */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                <Award className="w-4.5 h-4.5 text-indigo-500" />
                Mis Insignias Profesionales
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {BADGES.map(badge => {
                  const unlocked = unlockedBadges.includes(badge.id);
                  return (
                    <div 
                      key={badge.id}
                      className={`relative border rounded-2xl p-4 transition-all duration-200 flex gap-3.5 items-start ${
                        unlocked 
                          ? "bg-white border-neutral-200/90 shadow-xs hover:shadow-md" 
                          : "bg-neutral-50/50 border-neutral-100 opacity-75"
                      }`}
                    >
                      {/* Badge Icon circle */}
                      <div className={`p-3 rounded-xl shrink-0 ${
                        unlocked 
                          ? "bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 border border-indigo-100" 
                          : "bg-neutral-100 text-neutral-400 border border-neutral-200/30"
                      }`}>
                        {getBadgeIcon(badge.id === "candidato_preparado" && unlocked ? "CheckCircle2" : badge.iconName, unlocked)}
                      </div>

                      {/* Badge Details */}
                      <div className="space-y-1 pr-6">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h5 className={`text-xs font-extrabold ${unlocked ? 'text-neutral-900' : 'text-neutral-500 font-bold'}`}>
                            {badge.title}
                          </h5>
                          {unlocked ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase shrink-0">
                              Desbloqueado
                            </span>
                          ) : (
                            <span className="bg-neutral-100 text-neutral-500 border border-neutral-200 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase flex items-center gap-0.5 shrink-0">
                              <Lock className="w-2 h-2" /> Bloqueado
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 leading-normal font-medium">
                          {badge.description}
                        </p>
                        <div className="text-[10px] flex items-center gap-1.5 pt-1">
                          <span className="text-neutral-400 font-bold">Criterio:</span>
                          <span className={`font-extrabold ${unlocked ? 'text-indigo-600' : 'text-neutral-500'}`}>
                            {badge.conditionText}
                          </span>
                        </div>
                      </div>

                      {/* Floating Reward Indicator */}
                      <div className="absolute top-4 right-4 flex items-center gap-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                        <Zap className="w-2.5 h-2.5 text-amber-500" />
                        <span>+{badge.xpReward} XP</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* XP History Feed (Right side) */}
            <div className="bg-neutral-50/50 border border-neutral-200/50 rounded-2xl p-5 space-y-4 self-start">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5 border-b border-neutral-200/50 pb-2">
                <Flame className="w-4 h-4 text-amber-500" />
                Historial de Actividad
              </h4>

              {xpHistory.length === 0 ? (
                <div className="py-8 text-center text-neutral-400 text-xs">
                  Aún no has ganado experiencia. ¡Empieza adoptando metas o completando exámenes!
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {xpHistory.map(item => (
                    <div key={item.id} className="flex items-start justify-between gap-3 text-xs bg-white p-2.5 rounded-xl border border-neutral-200/40 shadow-2xs">
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-bold text-neutral-700 leading-tight">
                          {item.text}
                        </p>
                        <span className="text-[9px] text-neutral-400 font-medium">
                          {item.date}
                        </span>
                      </div>
                      <span className={`text-[10px] font-black shrink-0 px-1.5 py-0.5 rounded-md ${
                        item.xp > 0 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {item.xp > 0 ? `+${item.xp}` : item.xp} XP
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SALARY COMPARISON */}
      {activeTab === 'salary' && (
        <div className="space-y-6 animate-in fade-in duration-200" id="salary-comparison-tab">
          {/* Top Panel: Preference Summary & realistic indicator */}
          <div className="bg-neutral-50 dark:bg-slate-900/50 border border-neutral-200/60 dark:border-slate-800 rounded-2xl p-5 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Tus Preferencias Salariales
              </span>
              <h3 className="text-lg font-black text-neutral-950 dark:text-white flex items-baseline gap-1">
                {profile.preferences.desiredSalaryRange.currency}{" "}
                <span className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                  {profile.preferences.desiredSalaryRange.min.toLocaleString()} - {profile.preferences.desiredSalaryRange.max.toLocaleString()}
                </span>{" "}
                <span className="text-xs text-neutral-500 dark:text-slate-400 font-bold">/ mes</span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-slate-400 font-medium">
                Configurado para puestos de seniority <span className="text-neutral-700 dark:text-slate-200 font-black">{profile.preferences.seniorityLevel}</span> en{" "}
                <span className="text-neutral-700 dark:text-slate-200 font-black">{profile.preferences.residentCountry}</span> con modalidad{" "}
                <span className="text-neutral-700 dark:text-slate-200 font-black">{profile.preferences.locationType}</span>.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-950 border border-neutral-200/50 dark:border-slate-800/60 rounded-xl p-4 flex flex-col justify-center items-center text-center space-y-2 shrink-0 shadow-2xs">
              {salaryLoading ? (
                <div className="space-y-2 py-2">
                  <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin mx-auto" />
                  <span className="text-[10px] font-black text-neutral-400 uppercase">Evaluando viabilidad...</span>
                </div>
              ) : salaryError ? (
                <div className="space-y-1 text-rose-500">
                  <AlertCircle className="w-5 h-5 mx-auto" />
                  <span className="text-[10px] font-bold block">Error al cargar</span>
                </div>
              ) : salaryData?.overallComparison ? (
                <>
                  <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                    salaryData.overallComparison.isUserRangeRealistic
                      ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40"
                      : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40"
                  }`}>
                    {salaryData.overallComparison.isUserRangeRealistic ? "Rango Realista" : "Rango Optimista / Alto"}
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-slate-400 font-semibold leading-relaxed">
                    {salaryData.overallComparison.isUserRangeRealistic
                      ? "Tus expectativas salariales están perfectamente alineadas con los rangos salariales reales del mercado local."
                      : "Tus expectativas están ligeramente por encima de los promedios locales. ¡Mira las tácticas de negociación abajo!"}
                  </p>
                </>
              ) : (
                <div className="space-y-1">
                  <AlertCircle className="w-5 h-5 text-neutral-300 mx-auto" />
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Sin Datos</span>
                </div>
              )}
            </div>
          </div>

          {/* Core Content: Loading state, Error State, or Cards */}
          {salaryLoading && (
            <div className="py-16 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-100 dark:border-emerald-950 animate-pulse"></div>
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
                <DollarSign className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h4 className="text-sm font-extrabold text-neutral-900 dark:text-white">Analizando el Mercado en Tiempo Real</h4>
                <p className="text-xs text-neutral-500 dark:text-slate-400 font-medium leading-relaxed">
                  Buscando en Google los salarios promedio actuales para tus puestos guardados y comparando rangos en {profile.preferences.residentCountry}...
                </p>
              </div>
            </div>
          )}

          {salaryError && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/30 rounded-2xl p-6 text-center max-w-md mx-auto space-y-4">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-rose-800 dark:text-rose-400">Error de Conexión Salarial</h4>
                <p className="text-xs text-rose-600 dark:text-rose-500 font-medium">
                  {salaryError}
                </p>
              </div>
              <button
                onClick={fetchSalaryComparison}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 mx-auto transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reintentar Consulta
              </button>
            </div>
          )}

          {!salaryLoading && !salaryError && salaryData && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-300">
              {/* Left/Middle side: List of Roles and Gauges */}
              <div className="xl:col-span-2 space-y-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-slate-300 flex items-center gap-1.5">
                    <BarChart2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-500" />
                    Comparación por Puesto Guardado
                  </h4>
                  <button
                    onClick={fetchSalaryComparison}
                    title="Actualizar datos salariales"
                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800/50 text-neutral-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-500 transition-all cursor-pointer bg-white dark:bg-slate-900"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {salaryData.roles?.map((role: any, idx: number) => {
                    // Proportional graph setup
                    const uMin = profile.preferences.desiredSalaryRange.min;
                    const uMax = profile.preferences.desiredSalaryRange.max;
                    const mMin = role.marketMinSalary;
                    const mMax = role.marketMaxSalary;
                    const mAvg = role.marketAverageSalary;

                    const sMin = Math.min(uMin, mMin) * 0.85;
                    const sMax = Math.max(uMax, mMax) * 1.15;
                    const sRange = sMax - sMin || 1;

                    const marketStart = Math.max(0, Math.min(100, ((mMin - sMin) / sRange) * 100));
                    const marketWidth = Math.max(0, Math.min(100, ((mMax - mMin) / sRange) * 100));
                    const marketAvg = Math.max(0, Math.min(100, ((mAvg - sMin) / sRange) * 100));

                    const userMinPos = Math.max(0, Math.min(100, ((uMin - sMin) / sRange) * 100));
                    const userMaxPos = Math.max(0, Math.min(100, ((uMax - sMin) / sRange) * 100));

                    return (
                      <div key={idx} className="bg-white dark:bg-slate-900 border border-neutral-200/80 dark:border-slate-800 p-5 rounded-2xl space-y-4 shadow-2xs hover:border-neutral-300 dark:hover:border-slate-700 transition-all">
                        <div className="flex justify-between items-start gap-4 flex-wrap">
                          <div>
                            <h5 className="text-sm font-extrabold text-neutral-900 dark:text-white leading-tight">
                              {role.roleTitle}
                            </h5>
                            <span className="text-[10px] text-neutral-400 dark:text-slate-400 font-bold">
                              Mercado de {role.sourceCountry} · Certeza:{" "}
                              <span className={`font-black ${
                                role.confidence === "alta" ? "text-emerald-600 dark:text-emerald-500" : role.confidence === "media" ? "text-amber-600 dark:text-amber-500" : "text-neutral-500"
                              }`}>
                                {role.confidence.toUpperCase()}
                              </span>
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="block text-[10px] text-neutral-400 dark:text-slate-400 font-bold uppercase leading-none text-right">Promedio Mercado</span>
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                              {role.currency} {mAvg.toLocaleString()} <span className="text-[10px] text-neutral-400 dark:text-slate-500 font-bold">/ mes</span>
                            </span>
                          </div>
                        </div>

                        {/* Interactive Range Gauge Visualizer */}
                        <div className="pt-6 pb-6 px-1">
                          <div className="relative h-6 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                            {/* Market Range Highlight */}
                            <div 
                              className="absolute h-full bg-indigo-500/10 dark:bg-indigo-400/10 border-x border-indigo-400/30 rounded-full"
                              style={{ left: `${marketStart}%`, width: `${marketWidth}%` }}
                              title="Rango Salarial Promedio del Mercado"
                            />

                            {/* Market Average Line & Flag */}
                            <div 
                              className="absolute h-8 -top-1 w-0.5 bg-indigo-600 dark:bg-indigo-400 z-10"
                              style={{ left: `${marketAvg}%` }}
                            >
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-indigo-600 dark:bg-indigo-500 text-white font-black text-[8px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap uppercase">
                                Promedio: {role.currency} {mAvg.toLocaleString()}
                              </div>
                            </div>

                            {/* User Preferred Minimum */}
                            <div 
                              className="absolute h-8 -top-1 w-0.5 bg-emerald-500 dark:bg-emerald-400 z-20 border-dashed border-l-2"
                              style={{ left: `${userMinPos}%` }}
                            >
                              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500 dark:bg-emerald-600 text-white font-black text-[8px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                                Mínimo: {role.currency} {uMin.toLocaleString()}
                              </div>
                            </div>

                            {/* User Preferred Maximum */}
                            <div 
                              className="absolute h-8 -top-1 w-0.5 bg-rose-500 dark:bg-rose-400 z-20 border-dashed border-l-2"
                              style={{ left: `${userMaxPos}%` }}
                            >
                              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-rose-500 dark:bg-rose-600 text-white font-black text-[8px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                                Máximo: {role.currency} {uMax.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Market range legend values */}
                        <div className="flex justify-between text-[10px] text-neutral-400 dark:text-slate-500 font-bold px-1 pt-1">
                          <span>Mínimo Mercado: {role.currency} {mMin.toLocaleString()}</span>
                          <span>Máximo Mercado: {role.currency} {mMax.toLocaleString()}</span>
                        </div>

                        {/* Insight description box */}
                        <div className="p-3.5 bg-neutral-50 dark:bg-slate-950 rounded-xl border border-neutral-100 dark:border-slate-800 text-xs font-semibold text-neutral-600 dark:text-slate-300 leading-relaxed">
                          {role.insight}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right side: Overall Analysis, Tactics & Grounding Sources */}
              <div className="space-y-6">
                {/* Overall Analysis Box */}
                <div className="bg-indigo-50/50 dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 p-5 rounded-2xl space-y-3.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-slate-200 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Evaluación Salarial Global
                  </h4>
                  <p className="text-xs text-neutral-600 dark:text-slate-300 leading-relaxed font-semibold">
                    {salaryData.overallComparison?.analysisText}
                  </p>
                </div>

                {/* Negotiation Tactics */}
                <div className="bg-neutral-50 dark:bg-slate-900/40 border border-neutral-200/50 dark:border-slate-800 p-5 rounded-2xl space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-slate-300 flex items-center gap-1.5 border-b border-neutral-200/50 dark:border-slate-800 pb-2">
                    <Star className="w-4 h-4 text-amber-500 animate-pulse" />
                    Tácticas de Negociación IA
                  </h4>
                  <div className="space-y-3">
                    {salaryData.overallComparison?.negotiationTactics?.map((tactic: string, tIdx: number) => (
                      <div key={tIdx} className="flex gap-2.5 items-start text-xs font-semibold leading-relaxed text-neutral-600 dark:text-slate-300 bg-white dark:bg-slate-950 p-3 rounded-xl border border-neutral-200/40 dark:border-slate-800/60 shadow-2xs">
                        <div className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 h-5 w-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 border border-indigo-100 dark:border-indigo-900">
                          {tIdx + 1}
                        </div>
                        <p>{tactic}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grounding Sources / Citations */}
                {salaryData.groundingSources && salaryData.groundingSources.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 border border-neutral-200/80 dark:border-slate-800 p-5 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-slate-300 flex items-center gap-1.5">
                      <Search className="w-4 h-4 text-indigo-500" />
                      Fuentes Consultadas (Google Search)
                    </h4>
                    <p className="text-[10px] text-neutral-400 dark:text-slate-500 font-bold leading-normal">
                      Estos datos se derivan de la indexación actual de ofertas laborales y reportes de salarios locales:
                    </p>
                    <div className="space-y-2 pt-1">
                      {salaryData.groundingSources.map((source: any, sIdx: number) => (
                        <a
                          key={sIdx}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          referrerPolicy="no-referrer"
                          className="flex items-center justify-between text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline bg-neutral-50 dark:bg-slate-950 p-2.5 rounded-xl border border-neutral-100 dark:border-slate-800/80 transition-all"
                        >
                          <span className="truncate max-w-[200px]">{source.title}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-1.5" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: COVER LETTER GENERATOR */}
      {activeTab === 'cover-letter' && (
        <div id="cover-letter-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          
          {/* Config column */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm space-y-4">
              <div className="border-b border-neutral-100 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-indigo-500" />
                  Configuración de la Carta
                </h3>
                <p className="text-[10px] text-neutral-500 font-semibold mt-0.5">
                  Elige una postulación activa o introduce los datos manualmente.
                </p>
              </div>

              {/* Job Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">
                  Origen de la Oferta
                </label>
                <select
                  value={clSelectedJobId}
                  onChange={(e) => {
                    setClSelectedJobId(e.target.value);
                    if (e.target.value !== "manual") {
                      const selected = candidacies.find(c => c.id === e.target.value);
                      if (selected) {
                        setClManualJobTitle(selected.jobTitle);
                        setClManualCompany(selected.company);
                        setClManualJobDesc(selected.notes || `Postulado al cargo de ${selected.jobTitle} en ${selected.company}.`);
                      }
                    } else {
                      setClManualJobTitle("");
                      setClManualCompany("");
                      setClManualJobDesc("");
                    }
                  }}
                  className="w-full text-xs border border-neutral-200 rounded-xl p-2.5 bg-neutral-50 focus:bg-white focus:outline-none focus:border-indigo-500 font-semibold transition-all cursor-pointer"
                >
                  <option value="manual">✍️ Escribir manualmente...</option>
                  {candidacies.map((c) => (
                    <option key={c.id} value={c.id}>
                      💼 {c.jobTitle} en {c.company} ({c.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Manual Fields */}
              <div className="space-y-3.5 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">
                    Título del Puesto
                  </label>
                  <input
                    type="text"
                    value={clManualJobTitle}
                    onChange={(e) => setClManualJobTitle(e.target.value)}
                    disabled={clSelectedJobId !== "manual"}
                    placeholder="ej. Senior Fullstack Engineer"
                    className="w-full text-xs border border-neutral-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-indigo-500 font-semibold disabled:bg-neutral-50 disabled:text-neutral-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">
                    Empresa
                  </label>
                  <input
                    type="text"
                    value={clManualCompany}
                    onChange={(e) => setClManualCompany(e.target.value)}
                    disabled={clSelectedJobId !== "manual"}
                    placeholder="ej. Globant"
                    className="w-full text-xs border border-neutral-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-indigo-500 font-semibold disabled:bg-neutral-50 disabled:text-neutral-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">
                    Descripción / Requisitos del Cargo
                  </label>
                  <textarea
                    value={clManualJobDesc}
                    onChange={(e) => setClManualJobDesc(e.target.value)}
                    disabled={clSelectedJobId !== "manual"}
                    rows={4}
                    placeholder="Pega aquí la descripción del empleo o los requisitos principales para que la IA adapte tu perfil a esta oferta específica."
                    className="w-full text-xs border border-neutral-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-indigo-500 font-semibold disabled:bg-neutral-50 disabled:text-neutral-500 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Tone selection */}
              <div className="space-y-2 pt-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">
                  Tono del Mensaje
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "persuasivo", label: "🎯 Persuasivo" },
                    { id: "formal", label: "👔 Formal" },
                    { id: "creativo", label: "🎨 Creativo" },
                    { id: "entusiasta", label: "🔥 Entusiasta" }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setClTone(t.id)}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                        clTone === t.id
                          ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs font-bold"
                          : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {clError && (
                <div className="flex gap-2 items-center text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl text-xs font-semibold leading-normal">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{clError}</span>
                </div>
              )}

              {/* Submit button */}
              <button
                type="button"
                onClick={handleGenerateCoverLetter}
                disabled={clLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-300 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98 animate-pulse"
              >
                {clLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Generando carta...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    Redactar con Gemini 3.5
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated letter column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm space-y-4 flex flex-col h-full min-h-[500px]">
              
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800">
                      Resultado de Redacción
                    </h3>
                    <p className="text-[10px] text-neutral-500 font-semibold mt-0.5">
                      Texto listo para copiar y enviar.
                    </p>
                  </div>
                </div>

                {clGeneratedText && (
                  <button
                    type="button"
                    onClick={handleCopyCoverLetter}
                    className="py-1.5 px-3 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-neutral-200/60"
                  >
                    {clCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-extrabold">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Carta</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {clLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-4 animate-pulse">
                  <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Redactando tu Carta de Presentación
                    </p>
                    <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                      La IA de Gemini está analizando las habilidades de tu CV y emparejándolas con los requisitos del puesto para lograr el mayor impacto posible.
                    </p>
                  </div>
                </div>
              ) : clGeneratedText ? (
                <div className="flex-1 bg-slate-50/50 rounded-xl border border-slate-200/50 p-4.5 overflow-y-auto max-h-[550px] relative">
                  <pre className="text-xs text-neutral-850 font-medium whitespace-pre-wrap leading-relaxed font-sans select-text">
                    {clGeneratedText}
                  </pre>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-6">
                  <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center text-neutral-400 mb-3 border border-neutral-100">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-black text-slate-800 uppercase tracking-wide">
                    Sin Carta Generada
                  </p>
                  <p className="text-[10px] text-neutral-400 max-w-xs mx-auto mt-1 leading-relaxed">
                    Completa la configuración en la columna izquierda y presiona <span className="font-bold text-neutral-600">"Redactar con Gemini"</span> para redactar una carta sumamente persuasiva y adaptada a tus metas profesionales.
                  </p>
                </div>
              )}

              {/* Dynamic gamification tip */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 rounded-xl p-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="bg-amber-500 text-white p-1 rounded-md">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[10px] text-amber-900 font-semibold leading-snug">
                    <span className="font-extrabold uppercase block text-amber-700">Misión Profesional</span>
                    Consigue <span className="font-bold">100 XP</span> al generar tu carta personalizada con nuestro Co-Pilot.
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* CONGRATULATIONS BADGE UNLOCKED MODAL */}
      {newlyUnlockedBadge && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl border border-indigo-100 p-8 shadow-2xl max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-200 relative overflow-hidden">
            {/* Background glowing circles */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-200/30 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-amber-200/30 rounded-full blur-2xl"></div>

            {/* Glowing Icon Container */}
            <div className="relative mx-auto w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg border-4 border-white shadow-indigo-200">
              <div className="absolute inset-0 rounded-full border border-indigo-200 animate-ping opacity-25"></div>
              {/* Render dynamic icon for the modal */}
              {newlyUnlockedBadge.iconName === "Target" && <Target className="w-11 h-11 text-white" />}
              {newlyUnlockedBadge.iconName === "CheckCircle2" && <CheckCircle2 className="w-11 h-11 text-white" />}
              {newlyUnlockedBadge.iconName === "GraduationCap" && <GraduationCap className="w-11 h-11 text-white" />}
              {newlyUnlockedBadge.iconName === "Award" && <Award className="w-11 h-11 text-white" />}
              {newlyUnlockedBadge.iconName === "Bot" && <Bot className="w-11 h-11 text-white" />}
              {newlyUnlockedBadge.iconName === "Trophy" && <Trophy className="w-11 h-11 text-white" />}
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                ¡Nueva Insignia Desbloqueada!
              </span>
              <h3 className="text-xl font-black text-neutral-900 pt-1">
                {newlyUnlockedBadge.title}
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed font-medium px-4">
                {newlyUnlockedBadge.description}
              </p>
            </div>

            {/* Reward Box */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/70 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-amber-500 text-white p-1.5 rounded-lg">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block text-[10px] font-extrabold text-amber-700 uppercase leading-none">RECOMPENSA</span>
                  <span className="text-xs font-black text-amber-800">Bono de Experiencia de Aprendizaje</span>
                </div>
              </div>
              <span className="text-sm font-black text-amber-700">
                +{newlyUnlockedBadge.xpReward} XP
              </span>
            </div>

            {/* Confirm button */}
            <button
              onClick={() => setNewlyUnlockedBadge(null)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black border border-indigo-700/50 transition-all shadow-md cursor-pointer hover:shadow-indigo-100 active:scale-98"
            >
              ¡Excelente, sigamos!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

