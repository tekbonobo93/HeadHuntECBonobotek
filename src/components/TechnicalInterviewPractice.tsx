import React, { useState, useEffect } from "react";
import { 
  Bot, Sparkles, BookOpen, Send, CheckCircle2, AlertCircle, RotateCcw, 
  HelpCircle, ChevronRight, ListTodo, Trophy, Award, MessageSquareText,
  User, Check, Copy, KeyRound, ChevronDown, ChevronUp, Star
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, Candidacy } from "../types";
import { createJsonApiInit } from "../utils/serverState";

interface TechnicalInterviewPracticeProps {
  profile: UserProfile;
  candidacies: Candidacy[];
  onAwardXp: (amount: number, reason: string) => void;
}

interface TechnicalQuestion {
  id: string;
  question: string;
  topic: string;
  expectedConcept: string;
}

interface TechnicalEvaluation {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  suggestedAnswer: string;
}

export default function TechnicalInterviewPractice({
  profile,
  candidacies,
  onAwardXp
}: TechnicalInterviewPracticeProps) {
  const [selectedCandId, setSelectedCandId] = useState<string>("");
  const [questions, setQuestions] = useState<TechnicalQuestion[]>([]);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [evaluations, setEvaluations] = useState<Record<string, TechnicalEvaluation>>({});
  
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showExpectedConcept, setShowExpectedConcept] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Set initial selected candidacy when list updates
  useEffect(() => {
    if (candidacies.length > 0 && !selectedCandId) {
      // Find first saved or interviewing candidacy
      const firstValid = candidacies.find(c => c.status === "guardado" || c.status === "entrevista" || c.status === "postulado") || candidacies[0];
      setSelectedCandId(firstValid.id);
    }
  }, [candidacies]);

  const selectedCandidacy = candidacies.find(c => c.id === selectedCandId);

  const handleGenerateQuestions = async () => {
    if (!selectedCandidacy) {
      setError("Por favor selecciona una vacante para iniciar la simulación.");
      return;
    }

    setIsLoadingQuestions(true);
    setError(null);
    setQuestions([]);
    setActiveQuestionIdx(0);
    setUserAnswers({});
    setEvaluations({});

    try {
      const response = await fetch("/api/interview/technical/questions", {
        ...createJsonApiInit({
          method: "POST",
          body: JSON.stringify({
            profile,
            candidacy: selectedCandidacy,
          }),
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudieron generar las preguntas de la entrevista técnica.");
      }

      const data = await response.json();
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        onAwardXp(15, `Generaste preguntas técnicas para el puesto de ${selectedCandidacy.jobTitle}`);
      } else {
        throw new Error("No se devolvió un listado válido de preguntas.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Error al conectar con la IA para generar las preguntas: " + (err.message || err));
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleSubmitAnswer = async () => {
    const currentQuestion = questions[activeQuestionIdx];
    if (!currentQuestion) return;

    const answerText = userAnswers[currentQuestion.id] || "";
    if (answerText.trim().length < 20) {
      setError("Por favor escribe una respuesta técnica más detallada (mínimo 20 caracteres) antes de evaluarla.");
      return;
    }

    setIsEvaluating(true);
    setError(null);

    try {
      const response = await fetch("/api/interview/technical/evaluate", {
        ...createJsonApiInit({
          method: "POST",
          body: JSON.stringify({
            question: currentQuestion.question,
            answer: answerText,
            profile,
            candidacy: selectedCandidacy,
          }),
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo obtener la evaluación técnica de tu respuesta.");
      }

      const data = await response.json();
      setEvaluations(prev => ({
        ...prev,
        [currentQuestion.id]: data
      }));

      // Award XP based on the evaluation score
      const score = data.score || 70;
      let xpAward = 35; // base XP for participating
      if (score >= 90) {
        xpAward += 30; // +60 XP total for excellent technical answer
        onAwardXp(xpAward, `¡Excelente respuesta técnica (${score} puntos) en ${currentQuestion.topic}!`);
      } else if (score >= 75) {
        xpAward += 15; // +50 XP total for solid technical answer
        onAwardXp(xpAward, `Respuesta técnica sólida (${score} puntos) en ${currentQuestion.topic}`);
      } else {
        onAwardXp(xpAward, `Practicaste tu respuesta técnica en el tema: ${currentQuestion.topic}`);
      }

    } catch (err: any) {
      console.error(err);
      setError("Error al evaluar tu respuesta: " + (err.message || err));
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleCopySuggested = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleReset = () => {
    setQuestions([]);
    setActiveQuestionIdx(0);
    setUserAnswers({});
    setEvaluations({});
    setError(null);
  };

  const currentQuestion = questions[activeQuestionIdx];
  const currentEvaluation = currentQuestion ? evaluations[currentQuestion.id] : undefined;
  const currentAnswer = currentQuestion ? (userAnswers[currentQuestion.id] || "") : "";

  // Dynamic score styling
  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-600 border-emerald-200 bg-emerald-50";
    if (score >= 70) return "text-indigo-600 border-indigo-200 bg-indigo-50";
    return "text-amber-600 border-amber-200 bg-amber-50";
  };

  return (
    <div id="technical-interview-practice-container" className="bg-white rounded-xl border border-neutral-200/80 p-6 shadow-sm space-y-6">
      {/* Component Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-100 pb-4 gap-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-500 animate-pulse" />
            Entrenador de Preguntas Técnicas
          </h2>
          <p className="text-xs text-neutral-500">
            Pon a prueba tu solvencia técnica respondiendo preguntas diseñadas exclusivamente a partir del perfil del puesto y tu CV.
          </p>
        </div>
        {questions.length > 0 && (
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg border border-slate-200 font-bold transition-all cursor-pointer flex items-center gap-1.5 self-start md:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Nueva Simulación
          </button>
        )}
      </div>

      {/* ERROR MESSAGE DISPLAY */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-black cursor-pointer">×</button>
        </div>
      )}

      {/* STATE 1: NO PROFILE (NAME) LOADED */}
      {!profile.name && (
        <div className="p-8 bg-slate-50 border border-slate-200/60 rounded-xl text-center space-y-3">
          <User className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-700">Primero completa tu perfil profesional</p>
            <p className="text-xs text-slate-500 max-w-[360px] mx-auto leading-relaxed">
              Para generar preguntas de examen verdaderamente útiles, necesitamos conocer tu nombre e historial de habilidades mediante tu CV en la sección **'Mi Perfil'**.
            </p>
          </div>
        </div>
      )}

      {/* STATE 2: PROFILE EXIST BUT NO VACANCY SAVED */}
      {profile.name && candidacies.length === 0 && (
        <div className="p-8 bg-amber-50/40 border border-amber-100 rounded-xl text-center space-y-3">
          <MessageSquareText className="w-10 h-10 text-amber-500/80 mx-auto animate-bounce" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-amber-900">No tienes vacantes de empleo guardadas</p>
            <p className="text-xs text-amber-700/90 max-w-[420px] mx-auto leading-relaxed">
              Este entrenador analiza los requerimientos reales del puesto para formular preguntas técnicas rigurosas. Guarda o postula a alguna oferta en la sección **'Buscador'** para comenzar a practicar.
            </p>
          </div>
        </div>
      )}

      {/* STATE 3: FULLY READY TO CONFIGURE AND RUN PRACTICE */}
      {profile.name && candidacies.length > 0 && questions.length === 0 && (
        <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-6 space-y-5 animate-in fade-in duration-200">
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Selecciona una vacante para entrenar
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              La Inteligencia Artificial de Gemini absorberá la ficha técnica del rol y cruzará tus destrezas del CV para redactar 3 preguntas conceptuales y prácticas de alto nivel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                Puesto de Trabajo a Evaluar:
              </label>
              <select
                value={selectedCandId}
                onChange={(e) => setSelectedCandId(e.target.value)}
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
              onClick={handleGenerateQuestions}
              disabled={isLoadingQuestions}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-lg border border-indigo-700/50 transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-1.5 h-[38px] active:scale-95 disabled:opacity-50"
            >
              {isLoadingQuestions ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Redactando Preguntas...</span>
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 text-indigo-200" />
                  <span>Generar Preguntas de Examen</span>
                </>
              )}
            </button>
          </div>

          {selectedCandidacy && (
            <div className="mt-2 bg-white p-4 rounded-lg border border-slate-200/50 space-y-1 shadow-2xs">
              <p className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider">Perfil Técnico de Referencia:</p>
              <h4 className="font-bold text-xs text-slate-800">{selectedCandidacy.jobTitle}</h4>
              <p className="text-[10px] text-slate-500 font-bold">{selectedCandidacy.company} — {selectedCandidacy.location} ({selectedCandidacy.locationType})</p>
              <div className="flex flex-wrap gap-1 pt-2">
                {profile.skills.slice(0, 5).map((sk, index) => (
                  <span key={index} className="bg-slate-50 border border-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {sk}
                  </span>
                ))}
                {profile.skills.length > 5 && (
                  <span className="text-[10px] text-slate-400 font-extrabold flex items-center ml-1">
                    +{profile.skills.length - 5} más
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STATE 4: QUESTIONS ARE LOADED & INTERACTIVE WORKSPACE IS ACTIVE */}
      {questions.length > 0 && currentQuestion && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          
          {/* LEFT COLUMN: QUESTION NAVIGATOR */}
          <div className="space-y-3 lg:col-span-1">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preguntas de la Sesión</h3>
            <div className="flex flex-col gap-2">
              {questions.map((q, idx) => {
                const isSelected = idx === activeQuestionIdx;
                const hasAnswer = (userAnswers[q.id] || "").trim().length >= 20;
                const hasEval = !!evaluations[q.id];

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setActiveQuestionIdx(idx);
                      setShowExpectedConcept(false);
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected 
                        ? "bg-indigo-50/70 border-indigo-200 shadow-2xs" 
                        : "bg-white hover:bg-slate-50 border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isSelected ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        Pregunta {idx + 1}
                      </span>
                      {hasEval ? (
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                          evaluations[q.id].score >= 80 ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"
                        }`}>
                          <Award className="w-3 h-3" />
                          {evaluations[q.id].score} pts
                        </span>
                      ) : hasAnswer ? (
                        <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" title="Listo para evaluar" />
                      ) : null}
                    </div>
                    <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-relaxed">{q.question}</p>
                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5 shrink-0 truncate">📍 Tema: {q.topic}</span>
                  </button>
                );
              })}
            </div>

            <div className="bg-indigo-950 text-indigo-100 p-4 rounded-xl border border-indigo-950/40 space-y-1.5 shadow-sm">
              <div className="flex items-center gap-1.5 text-white font-extrabold text-xs">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>¿Cómo ganar XP?</span>
              </div>
              <p className="text-[10px] text-indigo-200/90 leading-relaxed">
                Recibe hasta <strong>+60 XP</strong> por cada respuesta técnica precisa y madura que sea evaluada positivamente por el simulador técnico de Gemini.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: ACTIVE QUESTION WORKSPACE & FEEDBACK */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* QUESTION DISPLAY CARD */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 md:p-6 space-y-4 shadow-3xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-100 text-indigo-700 p-1.5 rounded-lg">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 block">Tema: {currentQuestion.topic}</span>
                    <h3 className="text-xs font-extrabold text-slate-900 md:text-sm">Pregunta Técnica Evaluativa</h3>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-800 text-xs md:text-sm font-black leading-relaxed shadow-3xs">
                "{currentQuestion.question}"
              </div>

              {/* Collapsible Helper: Expected Concepts */}
              <div className="border border-neutral-200 bg-white rounded-xl overflow-hidden transition-all duration-200 shadow-3xs">
                <button
                  type="button"
                  onClick={() => setShowExpectedConcept(!showExpectedConcept)}
                  className="w-full flex items-center justify-between p-3.5 text-xs text-indigo-900 font-extrabold hover:bg-slate-50 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-indigo-500" />
                    ¿Qué conceptos técnicos espera oír el entrevistador?
                  </span>
                  <ChevronDown className={`w-4 h-4 text-indigo-600 transition-transform ${showExpectedConcept ? "rotate-180" : ""}`} />
                </button>
                {showExpectedConcept && (
                  <div className="p-4 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600 leading-relaxed font-semibold">
                    {currentQuestion.expectedConcept}
                  </div>
                )}
              </div>

              {/* Text Input area */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tu Respuesta Técnica:</label>
                <textarea
                  value={currentAnswer}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUserAnswers(prev => ({
                      ...prev,
                      [currentQuestion.id]: val
                    }));
                  }}
                  disabled={isEvaluating}
                  rows={5}
                  placeholder="Describe detalladamente cómo implementarías esta solución, qué librerías o herramientas usarías, qué trade-offs analizarías y comparte ejemplos prácticos de tu experiencia..."
                  className="w-full text-xs font-semibold p-4 border border-slate-200 bg-white rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 leading-relaxed"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                  <span>Mínimo recomendado: 20 caracteres</span>
                  <span className={currentAnswer.length < 20 ? "text-amber-600" : "text-emerald-600"}>
                    {currentAnswer.length} caracteres
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              {!currentEvaluation && (
                <div className="flex justify-end">
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={isEvaluating || currentAnswer.trim().length < 20}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg border border-indigo-700/50 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    {isEvaluating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Evaluando Respuesta...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Evaluar Respuesta (+35 XP)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* AI EVALUATION REPORT DISPLAY */}
            <AnimatePresence mode="wait">
              {currentEvaluation && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 md:p-6 shadow-md space-y-6"
                >
                  {/* Evaluation Score banner */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-emerald-100 text-emerald-800 p-2 rounded-xl">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 leading-none">Evaluación del Entrevistador</h4>
                        <span className="text-[10px] text-slate-400 font-bold block mt-1">Soporte de análisis de Gemini IA</span>
                      </div>
                    </div>

                    <div className={`px-4 py-2 rounded-xl border text-center flex items-center gap-2 shadow-3xs shrink-0 ${getScoreColor(currentEvaluation.score)}`}>
                      <span className="text-2xl font-black">{currentEvaluation.score}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider block leading-tight">Puntaje<br />Técnico</span>
                    </div>
                  </div>

                  {/* Core feedback explanation */}
                  <div className="space-y-1.5">
                    <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Análisis del Coach:</h5>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 border border-slate-100 p-4 rounded-xl">
                      {currentEvaluation.feedback}
                    </p>
                  </div>

                  {/* Strengths and Improvements grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 space-y-3">
                      <h5 className="text-[11px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600" />
                        Aciertos Técnicos
                      </h5>
                      <ul className="space-y-2">
                        {currentEvaluation.strengths.map((str, index) => (
                          <li key={index} className="text-[11px] text-slate-700 font-semibold flex items-start gap-2 leading-relaxed">
                            <span className="text-emerald-600 text-[10px] mt-0.5 shrink-0">✓</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-amber-50/40 border border-amber-100 rounded-xl p-4 space-y-3">
                      <h5 className="text-[11px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-500" />
                        Áreas de Mejora
                      </h5>
                      <ul className="space-y-2">
                        {currentEvaluation.improvements.map((imp, index) => (
                          <li key={index} className="text-[11px] text-slate-700 font-semibold flex items-start gap-2 leading-relaxed">
                            <span className="text-amber-500 text-xs mt-0.5 shrink-0">•</span>
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Suggested Answer recommendation */}
                  <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl space-y-3 border border-slate-950 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[11px] font-black text-indigo-300 uppercase tracking-widest flex items-center gap-1.5">
                        <Bot className="w-4 h-4 text-indigo-400" />
                        Respuesta Modelo (Nivel Senior)
                      </h5>
                      <button
                        onClick={() => handleCopySuggested(currentEvaluation.suggestedAnswer)}
                        className="px-2.5 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-indigo-200 hover:text-white border border-slate-700 rounded-md transition-all flex items-center gap-1 font-bold cursor-pointer"
                      >
                        {copiedText ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Modelo</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs leading-relaxed font-mono text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 whitespace-pre-wrap">
                      {currentEvaluation.suggestedAnswer}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
