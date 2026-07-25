import React, { useState, useEffect } from "react";
import { Search, Globe, Clock, Briefcase, Tag, Sparkles, ExternalLink, Bookmark, CheckCircle, ChevronDown, ChevronUp, AlertCircle, Info, SlidersHorizontal } from "lucide-react";
import { JobOffer, UserProfile } from "../types";
import { createJsonApiInit } from "../utils/serverState";

// Helper function to extract numeric salary information
function parseSalaryNumbers(salaryStr: string): { min: number; max: number } {
  if (!salaryStr) return { min: 0, max: 0 };

  // Remove dots and commas used as thousand separators, so "35,000" becomes "35000"
  const normalized = salaryStr.replace(/[\s\.,]/g, "");
  
  // Find all integers in the string
  const numbers = normalized.match(/\d+/g);
  if (!numbers || numbers.length === 0) return { min: 0, max: 0 };

  const parsed = numbers.map((n) => parseInt(n, 10));

  // Determine if it's annual (if string contains "año", "year", "annual", "€/año", etc. or if the number is > 15000)
  const isYearly = /año|year|annual|ans/i.test(salaryStr) || (parsed[0] > 15000 && !/mes|month/i.test(salaryStr));

  let min = parsed[0] || 0;
  let max = parsed[1] || min;

  if (isYearly) {
    min = Math.round(min / 12);
    max = Math.round(max / 12);
  }

  return { min, max };
}

interface JobBoardProps {
  profile: UserProfile;
  onSaveJob: (job: JobOffer, status: 'guardado' | 'postulado') => void;
  savedJobIds: string[];
  appliedJobIds: string[];
}

const SCANNING_STEPS = [
  "Iniciando escaneo inteligente...",
  "Escaneando ofertas en LinkedIn...",
  "Extrayendo vacantes de Indeed...",
  "Buscando puestos compatibles en Tecnoempleo y Computrabajo...",
  "Filtrando según tus preferencias de salario y ubicación...",
  "Analizando compatibilidad con Inteligencia Artificial...",
  "Centralizando ofertas en tu Panel de Control..."
];

export default function JobBoard({ profile, onSaveJob, savedJobIds, appliedJobIds }: JobBoardProps) {
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [keywordFilter, setKeywordFilter] = useState("");
  const [minSalaryFilter, setMinSalaryFilter] = useState(0);

  const getJobApplyUrl = (job: JobOffer) => {
    if (job.applyUrl && job.applyUrl.startsWith("http") && !job.applyUrl.includes("example.com") && job.applyUrl !== "#") {
      return job.applyUrl;
    }
    // Si es "#" o una URL simulada, creamos una búsqueda inteligente en Google para facilitarle encontrar el anuncio original real
    const searchQuery = `${job.title} "${job.company}" vacante empleo ${job.location || ""} ${job.sourcePlatform || ""}`;
    return `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
  };

  // Trigger automated search on mount or when skills change to populate the board with personalized items
  useEffect(() => {
    handleSearch();
  }, [profile.skills, profile.preferences]);

  // Handle the scanning step simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setScanStepIndex(0);
      interval = setInterval(() => {
        setScanStepIndex((prev) => {
          if (prev < SCANNING_STEPS.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError(null);
    setJobs([]);

    try {
      const response = await fetch("/api/jobs/search", {
        ...createJsonApiInit({
          method: "POST",
          body: JSON.stringify({
            query,
            profile: {
              skills: profile.skills,
              experience: profile.experience,
            },
            preferences: profile.preferences,
          }),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Error al buscar ofertas de trabajo");
      }

      const results = await response.json();
      setJobs(results);
      localStorage.setItem("talentomatch_cached_jobs", JSON.stringify(results));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al conectar con el servidor de búsqueda inteligente.");
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 70) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) return "Alta Compatibilidad";
    if (score >= 70) return "Compatibilidad Media";
    return "Baja Compatibilidad";
  };

  const toggleExpand = (id: string) => {
    setExpandedJobId(expandedJobId === id ? null : id);
  };

  const filteredJobs = jobs.filter((job) => {
    // 1. Keyword search filter (title, company, description, location, requirements, sourcePlatform, salary)
    if (keywordFilter.trim() !== "") {
      const kw = keywordFilter.toLowerCase();
      const matchTitle = job.title.toLowerCase().includes(kw);
      const matchCompany = job.company.toLowerCase().includes(kw);
      const matchDesc = job.description.toLowerCase().includes(kw);
      const matchLocation = job.location.toLowerCase().includes(kw);
      const matchReqs = job.requirements.some(r => r.toLowerCase().includes(kw));
      const matchPlatform = job.sourcePlatform.toLowerCase().includes(kw);
      const matchSalary = job.salary.toLowerCase().includes(kw);
      
      if (!matchTitle && !matchCompany && !matchDesc && !matchLocation && !matchReqs && !matchPlatform && !matchSalary) {
        return false;
      }
    }

    // 2. Salary filter
    if (minSalaryFilter > 0) {
      const parsed = parseSalaryNumbers(job.salary);
      const jobMaxVal = parsed.max || parsed.min || 0;
      // If job has a salary specified and is below the filter, hide it
      if (jobMaxVal > 0 && jobMaxVal < minSalaryFilter) {
        return false;
      }
    }

    return true;
  });

  return (
    <div id="job-board-container" className="space-y-6">
      {/* Search Bar & Stats */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cargo, palabra clave o tecnología (ej. Frontend React, Node.js, Diseñador UX)..."
            className="w-full pl-11 pr-4 py-3 text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium text-neutral-800 shadow-sm transition-all"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 bg-indigo-600 text-white font-medium text-sm rounded-xl hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
        >
          {isLoading ? "Escaneando..." : "Buscar con IA"}
        </button>
      </form>

      {/* Loading & Scanning simulation */}
      {isLoading && (
        <div className="bg-white rounded-xl border border-neutral-200/80 p-8 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-3 bg-indigo-50 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-indigo-600 animate-bounce" />
            </div>
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="font-semibold text-neutral-900 text-base">Escáner Web Inteligente Activo</h3>
            <p className="text-sm font-medium text-indigo-600">{SCANNING_STEPS[scanStepIndex]}</p>
            <div className="w-64 h-1.5 bg-neutral-100 rounded-full overflow-hidden mx-auto">
              <div
                className="h-full bg-indigo-600 transition-all duration-1000 ease-out"
                style={{ width: `${((scanStepIndex + 1) / SCANNING_STEPS.length) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-neutral-400">
              Estamos buscando ofertas compatibles en más de 20 portales laborales y calculando la compatibilidad con tu currículum.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-start gap-3 text-sm shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Error de Conexión: </span>
            {error}
            <p className="mt-1 text-xs text-red-600">
              Asegúrate de que la API de Gemini esté activa o intenta refrescar tus preferencias de búsqueda.
            </p>
          </div>
        </div>
      )}

      {/* Search results */}
      {!isLoading && !error && jobs.length === 0 && (
        <div className="bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-200 p-10 text-center flex flex-col items-center justify-center">
          <Briefcase className="w-12 h-12 text-neutral-300 mb-3" />
          <p className="text-neutral-600 font-medium text-sm">No se encontraron ofertas laborales todavía.</p>
          <p className="text-neutral-400 text-xs mt-1 max-w-sm">
            Escribe un término de búsqueda arriba o sube tu CV para que la IA escanee vacantes adaptadas a tus habilidades de forma automática.
          </p>
        </div>
      )}

      {!isLoading && !error && jobs.length > 0 && (
        <div className="space-y-4">
          {/* Panel de Refinamiento en Tiempo Real */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Refinar resultados en tiempo real</h3>
                  <p className="text-[11px] text-neutral-500">Filtra instantáneamente las vacantes encontradas por la IA</p>
                </div>
              </div>
              
              {(keywordFilter !== "" || minSalaryFilter > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setKeywordFilter("");
                    setMinSalaryFilter(0);
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold transition-colors cursor-pointer bg-transparent border-none self-end sm:self-auto"
                >
                  Limpiar Filtros de Refinamiento
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Keyword filter input */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                  Buscar por cargo, empresa o requisito
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={keywordFilter}
                    onChange={(e) => setKeywordFilter(e.target.value)}
                    placeholder="Filtrar por tecnología, ubicación, empresa..."
                    className="w-full text-xs pl-9 pr-3 py-2 border border-neutral-200 rounded-lg bg-neutral-50/50 focus:outline-none focus:border-indigo-500 font-medium text-neutral-800"
                  />
                </div>
              </div>

              {/* Salary filter input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                    Filtro Salarial Mínimo
                  </label>
                  <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                    {minSalaryFilter === 0
                      ? "Cualquier salario"
                      : `+ $${minSalaryFilter.toLocaleString()}/mes eq.`}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={0}
                    max={8000}
                    step={250}
                    value={minSalaryFilter}
                    onChange={(e) => setMinSalaryFilter(Number(e.target.value))}
                    className="flex-grow accent-indigo-600 cursor-pointer h-1.5 bg-neutral-100 rounded-lg appearance-none"
                  />

                  <select
                    value={minSalaryFilter}
                    onChange={(e) => setMinSalaryFilter(Number(e.target.value))}
                    className="text-xs font-semibold bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-neutral-700 focus:outline-none shrink-0"
                  >
                    <option value={0}>Todos</option>
                    <option value={1500}>&gt; $1,500/mes</option>
                    <option value={2500}>&gt; $2,500/mes</option>
                    <option value={3500}>&gt; $3,500/mes</option>
                    <option value={5000}>&gt; $5,000/mes</option>
                    <option value={7000}>&gt; $7,000/mes</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-neutral-500 px-1 gap-2">
            <span>Resultados de empleo centralizados en tiempo real</span>
            <span className="font-semibold">
              {filteredJobs.length === jobs.length
                ? `${jobs.length} Ofertas de Empleo Encontradas`
                : `Mostrando ${filteredJobs.length} de ${jobs.length} ofertas (refinamiento activo)`}
            </span>
          </div>

          {/* Banner explicativo de postulación real vs simulación interna */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-4 text-xs text-amber-800 flex items-start gap-3 shadow-xs">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">💡 Nota sobre las Postulaciones</p>
              <p className="leading-relaxed text-amber-700">
                La plataforma simula el proceso de postulación mediante el botón <strong className="text-amber-900">"Postularse con IA"</strong> para registrar el empleo en tu panel de seguimiento y permitir que la IA te prepare. Para postularte de verdad, haz clic en <strong className="text-amber-900">"Ver oferta original"</strong> para abrir el enlace o la búsqueda del anuncio oficial en una nueva pestaña y aplicar de forma manual.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {filteredJobs.length === 0 ? (
              <div className="bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200 p-12 text-center flex flex-col items-center justify-center space-y-3">
                <AlertCircle className="w-10 h-10 text-neutral-400 stroke-[1.5]" />
                <div>
                  <h4 className="text-xs font-bold text-neutral-700">No hay ofertas con estos filtros</h4>
                  <p className="text-[11px] text-neutral-500 mt-1 max-w-sm">
                    Modifica tus filtros de refinamiento por palabra clave o ajusta el salario para ver los resultados encontrados por la IA.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setKeywordFilter("");
                    setMinSalaryFilter(0);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer border-none shadow-xs mt-2"
                >
                  Restaurar Filtros
                </button>
              </div>
            ) : (
              filteredJobs.map((job) => {
                const isSaved = savedJobIds.includes(job.id);
                const isApplied = appliedJobIds.includes(job.id);
                const isExpanded = expandedJobId === job.id;

                return (
                  <div
                    key={job.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden ${
                      job.compatibilityScore >= 85
                        ? "border-l-4 border-l-emerald-500"
                        : job.compatibilityScore >= 70
                        ? "border-l-4 border-l-indigo-600"
                        : "border-l-4 border-l-slate-300"
                    } ${
                      isExpanded ? "border-indigo-200 ring-1 ring-indigo-50" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Job Header Info */}
                    <div className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="text-xs font-bold text-indigo-600 uppercase bg-indigo-50 px-2.5 py-1 rounded-full">
                            {job.sourcePlatform}
                          </span>
                          <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {job.postedDate}
                          </span>
                          <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5" />
                            {job.jobType === "completa" ? "Jornada Completa" : "Media Jornada"}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-semibold text-neutral-900 text-lg hover:text-indigo-600 transition-colors">
                            {job.title}
                          </h3>
                          <p className="text-sm font-medium text-neutral-600">{job.company}</p>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 font-medium">
                          <span className="flex items-center gap-1">
                            <Globe className="w-4 h-4 text-neutral-400" />
                            {job.location} ({job.locationType})
                          </span>
                          <span>•</span>
                          <span>Seniority: <strong className="capitalize text-neutral-700">{job.seniorityLevel}</strong></span>
                          <span>•</span>
                          <span className="text-indigo-600 font-bold">{job.salary}</span>
                        </div>
                      </div>

                      {/* AI Compatibility Circle Score */}
                      <div className="flex items-center gap-3 shrink-0 self-start md:self-auto border-t md:border-t-0 pt-3 md:pt-0 border-neutral-100">
                        <div className={`border rounded-xl p-3 flex flex-col items-center justify-center text-center w-24 h-24 ${getScoreColor(job.compatibilityScore)}`}>
                          <span className="text-2xl font-black leading-none">{job.compatibilityScore}%</span>
                          <span className="text-[10px] font-bold mt-1 uppercase tracking-tight">Match</span>
                        </div>
                        <div className="space-y-1.5 flex-grow">
                          <span className="text-xs font-bold text-neutral-700 block">
                            {getScoreBadge(job.compatibilityScore)}
                          </span>
                          <button
                            onClick={() => toggleExpand(job.id)}
                            className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1 transition-colors"
                          >
                            {isExpanded ? "Ocultar análisis" : "Ver análisis de IA"}
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Panel: Requirements, Description, and AI Compatibility Analysis */}
                    {isExpanded && (
                      <div className="bg-neutral-50/50 border-t border-neutral-200/80 p-5 space-y-4 text-sm text-neutral-700">
                        <div>
                          <h4 className="font-semibold text-neutral-800 mb-1 flex items-center gap-1">
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                            Análisis de Compatibilidad de la IA
                          </h4>
                          <p className="text-xs text-neutral-600 leading-relaxed bg-indigo-50/30 border border-indigo-100/50 rounded-xl p-3">
                            {job.compatibilityAnalysis}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-neutral-800 mb-1.5">Descripción del Rol</h4>
                            <p className="text-xs text-neutral-600 leading-relaxed whitespace-pre-line">
                              {job.description}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-neutral-800 mb-1.5 flex items-center gap-1">
                              <Tag className="w-4 h-4 text-neutral-400" />
                              Requisitos Clave
                            </h4>
                            <ul className="space-y-1">
                              {job.requirements.map((req, i) => (
                                <li key={i} className="text-xs text-neutral-600 flex items-start gap-1.5">
                                  <span className="text-indigo-500 font-bold mt-0.5">•</span>
                                  {req}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions Bar */}
                    <div className="bg-neutral-50 px-5 py-3 border-t border-neutral-100 flex items-center justify-between gap-4">
                      <div className="text-xs text-neutral-400 font-medium">
                        Plataforma de postulación original: <strong className="text-neutral-500">{job.sourcePlatform}</strong>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onSaveJob(job, "guardado")}
                          disabled={isSaved || isApplied}
                          className={`p-2 rounded-lg border text-sm transition-all flex items-center gap-1 ${
                            isSaved || isApplied
                              ? "bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed"
                              : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 hover:text-indigo-600 cursor-pointer"
                          }`}
                          title={isSaved ? "Ya guardada en tu panel" : "Guardar para después"}
                        >
                          <Bookmark className={`w-4 h-4 ${isSaved ? "fill-neutral-400 text-neutral-400" : ""}`} />
                          <span className="text-xs font-semibold hidden sm:inline">
                            {isSaved ? "Guardada" : isApplied ? "Postulado" : "Guardar"}
                          </span>
                        </button>

                        {/* Enlace externo para postularse real de forma manual */}
                        <a
                          href={getJobApplyUrl(job)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 hover:text-indigo-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Ver la publicación original en una pestaña nueva para postularte de verdad manualmente"
                        >
                          <ExternalLink className="w-4 h-4 text-neutral-400" />
                          <span className="hidden sm:inline">Ver oferta original</span>
                          <span className="sm:hidden">Ver oferta</span>
                        </a>

                        <button
                          onClick={() => onSaveJob(job, "postulado")}
                          disabled={isApplied}
                          className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isApplied
                              ? "bg-green-100 text-green-700 cursor-not-allowed"
                              : "bg-indigo-600 text-white hover:bg-indigo-700"
                          }`}
                          title="Registrar postulación en el simulador y panel de seguimiento"
                        >
                          {isApplied ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Postulado
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 animate-pulse" />
                              Postularse con IA
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
