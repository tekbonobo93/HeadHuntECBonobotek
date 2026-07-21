import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from "recharts";
import { SIMULATED_JOB_POOL } from "../data";
import { TrendingUp, Award, MapPin, DollarSign, BarChart3, Filter, Briefcase, ChevronRight, HelpCircle } from "lucide-react";

// Color palettes for Recharts
const CHART_COLORS = [
  "#4f46e5", // Indigo
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#8b5cf6", // Violet
  "#3b82f6"  // Blue
];

// Helper to parse salary ranges and calculate an average numeric value in USD/month
const parseAverageSalary = (salaryStr: string): number => {
  if (!salaryStr) return 0;
  // Format: "$4,500 - $5,500 USD/mes" or "$600 - $900 USD/mes"
  const numbers = salaryStr.replace(/[^0-9\-]/g, "").split("-");
  if (numbers.length === 2) {
    const min = parseInt(numbers[0], 10);
    const max = parseInt(numbers[1], 10);
    if (!isNaN(min) && !isNaN(max)) {
      return (min + max) / 2;
    }
  } else if (numbers.length === 1) {
    const val = parseInt(numbers[0], 10);
    if (!isNaN(val)) return val;
  }
  return 0;
};

export default function MarketAnalysis() {
  const [selectedSeniority, setSelectedSeniority] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  // 1. Filtered Job Pool based on User Selection
  const filteredJobs = useMemo(() => {
    return SIMULATED_JOB_POOL.filter((job) => {
      const matchesSeniority = selectedSeniority === "all" || job.seniorityLevel === selectedSeniority;
      const matchesLocation = selectedLocation === "all" || job.locationType === selectedLocation;
      return matchesSeniority && matchesLocation;
    });
  }, [selectedSeniority, selectedLocation]);

  // 2. Aggregate Skills / Requirements
  const skillsData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    filteredJobs.forEach((job) => {
      job.requirements.forEach((req) => {
        // Clean up and normalize typical requirement variations for a cleaner chart
        let cleanReq = req.trim();
        const lower = cleanReq.toLowerCase();
        
        if (lower.startsWith("react")) cleanReq = "React";
        else if (lower.startsWith("typescript")) cleanReq = "TypeScript";
        else if (lower.startsWith("javascript")) cleanReq = "JavaScript";
        else if (lower.includes("tailwind") || lower === "css") cleanReq = "Tailwind CSS / CSS";
        else if (lower.includes("node")) cleanReq = "Node.js";
        else if (lower.includes("figma") || lower.includes("ui/ux")) cleanReq = "UI/UX & Figma";
        else if (lower.includes("python")) cleanReq = "Python";
        else if (lower.includes("sql") || lower.includes("postgres") || lower.includes("mongo")) cleanReq = "Bases de Datos";
        else if (lower.includes("inglés") || lower.includes("ingles")) cleanReq = "Inglés (Idioma)";
        
        counts[cleanReq] = (counts[cleanReq] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: filteredJobs.length > 0 ? Math.round((count / filteredJobs.length) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8 most demanded skills
  }, [filteredJobs]);

  // 3. Aggregate Location Types (Remoto vs Híbrido vs Presencial)
  const locationTypeData = useMemo(() => {
    const counts: { [key: string]: number } = { remoto: 0, hibrido: 0, presencial: 0 };
    filteredJobs.forEach((job) => {
      if (counts[job.locationType] !== undefined) {
        counts[job.locationType] += 1;
      }
    });

    const labelsMap: { [key: string]: string } = {
      remoto: "Remoto",
      hibrido: "Híbrido",
      presencial: "Presencial"
    };

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([key, count]) => ({
        name: labelsMap[key] || key,
        value: count
      }));
  }, [filteredJobs]);

  // 4. Aggregate Seniority Levels (junior, semi-senior, senior, trainee)
  const seniorityData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    filteredJobs.forEach((job) => {
      const level = job.seniorityLevel;
      counts[level] = (counts[level] || 0) + 1;
    });

    const labelsMap: { [key: string]: string } = {
      trainee: "Trainee (Prácticas)",
      junior: "Junior",
      "semi-senior": "Semi-Senior",
      senior: "Senior"
    };

    return Object.entries(counts).map(([key, count]) => ({
      name: labelsMap[key] || key,
      value: count
    }));
  }, [filteredJobs]);

  // 5. Calculate KPIs for Market Analytics Header
  const marketKPIs = useMemo(() => {
    const totalCount = filteredJobs.length;
    
    // Top skill
    const topSkill = skillsData[0]?.name || "N/A";
    const topSkillPct = skillsData[0]?.percentage || 0;

    // Average salary calculation
    let totalSalarySum = 0;
    let validSalaryCount = 0;
    filteredJobs.forEach((job) => {
      const avg = parseAverageSalary(job.salary);
      if (avg > 0) {
        totalSalarySum += avg;
        validSalaryCount++;
      }
    });
    const averageSalary = validSalaryCount > 0 ? Math.round(totalSalarySum / validSalaryCount) : 0;

    // Remote ratio
    const remoteCount = filteredJobs.filter(j => j.locationType === 'remoto').length;
    const remoteRatio = totalCount > 0 ? Math.round((remoteCount / totalCount) * 100) : 0;

    return {
      totalCount,
      topSkill,
      topSkillPct,
      averageSalary,
      remoteRatio
    };
  }, [filteredJobs, skillsData]);

  return (
    <div className="space-y-6">
      {/* Dynamic Header & Filters Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-500" />
              Filtros de Análisis del Mercado
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Ajusta las dimensiones para analizar demandas técnicas y salarios en tiempo real
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Seniority Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Nivel de Experiencia</label>
              <select
                value={selectedSeniority}
                onChange={(e) => setSelectedSeniority(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">Todos los niveles</option>
                <option value="trainee">Trainee</option>
                <option value="junior">Junior</option>
                <option value="semi-senior">Semi-Senior</option>
                <option value="senior">Senior</option>
              </select>
            </div>

            {/* Location Type Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Modalidad</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">Todas las modalidades</option>
                <option value="remoto">Remoto</option>
                <option value="hibrido">Híbrido</option>
                <option value="presencial">Presencial</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Jobs Analysed */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Vacantes Mapeadas</span>
            <div className="w-7 h-7 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-800 dark:text-white">{marketKPIs.totalCount}</span>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Ofertas activas en la simulación</p>
          </div>
        </div>

        {/* KPI 2: Top Demanded Skill */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Habilidad Más Solicitada</span>
            <div className="w-7 h-7 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-extrabold text-slate-800 dark:text-white truncate block max-w-full" title={marketKPIs.topSkill}>
              {marketKPIs.topSkill}
            </span>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              Presente en el <strong className="text-slate-700 dark:text-slate-300">{marketKPIs.topSkillPct}%</strong> de las ofertas
            </p>
          </div>
        </div>

        {/* KPI 3: Average Monthly Salary */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Salario Promedio</span>
            <div className="w-7 h-7 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-800 dark:text-white">
              {marketKPIs.averageSalary > 0 ? `$${marketKPIs.averageSalary.toLocaleString()}` : "N/A"}
            </span>
            <p className="text-[10px] text-slate-400 font-medium mt-1">USD mensuales de media estimada</p>
          </div>
        </div>

        {/* KPI 4: Remote percentage */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cuota de Teletrabajo</span>
            <div className="w-7 h-7 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-800 dark:text-white">{marketKPIs.remoteRatio}%</span>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Ofertas con modalidad 100% remota</p>
          </div>
        </div>
      </div>

      {/* Main Charts Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Most Demanded Skills (Horizontal Bar Chart) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Habilidades Técnicas con Mayor Demanda
            </h4>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Frecuencia de competencias claves solicitadas por los reclutadores en el set filtrado
            </p>
          </div>

          <div className="h-72 mt-6 w-full text-xs">
            {skillsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-medium italic">
                No hay suficientes ofertas registradas para este filtro
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={skillsData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 25, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis 
                    type="number" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    allowDecimals={false} 
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white rounded-xl p-2.5 shadow-xl border border-slate-800 text-xs font-sans">
                            <p className="font-bold text-indigo-400">{data.name}</p>
                            <p className="text-[11px] mt-1">
                              Menciones: <span className="font-semibold text-white">{data.count}</span>
                            </p>
                            <p className="text-[11px]">
                              Presencia: <span className="font-semibold text-white">{data.percentage}%</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name="Menciones"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={22}
                  >
                    {skillsData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS[index % CHART_COLORS.length]} 
                        className="transition-opacity duration-200"
                        fillOpacity={hoveredBar === null || hoveredBar === entry.name ? 1.0 : 0.4}
                        onMouseEnter={() => setHoveredBar(entry.name)}
                        onMouseLeave={() => setHoveredBar(null)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Location Type Distribution (Donut Chart) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-indigo-500" />
              Distribución de Modalidad
            </h4>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Participación porcentual de trabajo remoto, híbrido o presencial
            </p>
          </div>

          <div className="h-44 mt-4 relative flex items-center justify-center">
            {locationTypeData.length === 0 ? (
              <span className="text-xs text-slate-400 italic">Sin datos de modalidad</span>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={locationTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {locationTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 2) % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Percentage Display */}
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-black text-slate-800 dark:text-white leading-none">{marketKPIs.remoteRatio}%</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">Remoto</span>
                </div>
              </>
            )}
          </div>

          {/* Location Legend */}
          <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3 text-[11px]">
            {locationTypeData.map((item, index) => {
              const pct = marketKPIs.totalCount > 0 ? Math.round((item.value / marketKPIs.totalCount) * 100) : 0;
              return (
                <div key={item.name} className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: CHART_COLORS[(index + 2) % CHART_COLORS.length] }}
                    ></span>
                    <span>{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{item.value} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Row 3: Experience Levels Distribution & Matching Jobs list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Seniority Level (Bar Chart) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-500" />
              Distribución por Seniority
            </h4>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Volumen de ofertas clasificadas según requerimientos de trayectoria laboral
            </p>
          </div>

          <div className="h-52 mt-6 w-full text-xs">
            {seniorityData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-medium italic">
                Sin datos de seniority
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seniorityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }}
                  />
                  <Bar
                    dataKey="value"
                    name="Vacantes"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={35}
                    fill="#4f46e5"
                  >
                    {seniorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 4) % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Side: Detailed matching jobs currently in pool (2 columns span) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-indigo-500" />
                Vacantes de Referencia en el Mercado ({filteredJobs.length})
              </h4>
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                Datos Reales
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Explora las fuentes simuladas actuales que nutren los gráficos del análisis
            </p>
          </div>

          <div className="mt-4 space-y-3 overflow-y-auto max-h-56 pr-1 custom-scrollbar">
            {filteredJobs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-medium italic">
                Ninguna vacante coincide con los filtros seleccionados actualmente.
              </div>
            ) : (
              filteredJobs.map((job) => (
                <div 
                  key={job.id} 
                  className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{job.title}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                        {job.locationType}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold">{job.company} — {job.location}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {job.requirements.slice(0, 3).map((req, idx) => (
                        <span 
                          key={idx} 
                          className="text-[9px] bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md border border-indigo-100/30 font-medium"
                        >
                          {req}
                        </span>
                      ))}
                      {job.requirements.length > 3 && (
                        <span className="text-[9px] text-slate-400 font-bold">+{job.requirements.length - 3}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-emerald-600 block">{job.salary}</span>
                    <span className="text-[9px] text-slate-400 font-medium mt-0.5 block">{job.sourcePlatform}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Information Tip Banner */}
      <div className="bg-slate-50 dark:bg-slate-800/20 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">¿Cómo usar este Análisis de Mercado?</h5>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Nuestros gráficos se basan en el pool de vacantes activas simuladas del portal de empleo. Al analizar qué habilidades solicitan los puestos, puedes optimizar las palabras clave de tu currículum (en la pestaña de <strong>Mi Perfil</strong>) para maximizar tu compatibilidad y ser preseleccionado por nuestros algoritmos de emparejamiento inteligente de TalentoMatch IA.
          </p>
        </div>
      </div>
    </div>
  );
}
