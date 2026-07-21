import React from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from "recharts";
import { Candidacy } from "../types";
import { TrendingUp, Users, CheckCircle2, MessageSquare, Briefcase, Calendar, PieChart as PieIcon } from "lucide-react";

interface SearchStatsProps {
  candidacies: Candidacy[];
}

// Helper to deduce sector based on job title and company
const getSectorForJob = (title: string, company: string): string => {
  const t = `${title} ${company}`.toLowerCase();
  if (t.includes("bank") || t.includes("finan") || t.includes("fintech") || t.includes("pago") || t.includes("crypto") || t.includes("ledger") || t.includes("cobro")) return "Fintech";
  if (t.includes("shop") || t.includes("cart") || t.includes("commer") || t.includes("mercado") || t.includes("retail") || t.includes("sales") || t.includes("tienda")) return "E-commerce";
  if (t.includes("health") || t.includes("medi") || t.includes("doctor") || t.includes("bio") || t.includes("farma") || t.includes("salud")) return "Healthtech";
  if (t.includes("ai") || t.includes("openai") || t.includes("gemini") || t.includes("inteligen") || t.includes("cloud") || t.includes("aws") || t.includes("data") || t.includes("deep") || t.includes("ml")) return "AI & Deeptech";
  if (t.includes("saas") || t.includes("soft") || t.includes("b2b") || t.includes("hub") || t.includes("plataforma")) return "SaaS / B2B";
  if (t.includes("game") || t.includes("play") || t.includes("diver") || t.includes("media") || t.includes("stream") || t.includes("cine") || t.includes("music")) return "Entretenimiento";
  if (t.includes("edu") || t.includes("learn") || t.includes("school") || t.includes("clase")) return "Edtech";
  return "Tecnología / Consultoría";
};

// Helper to parse Spanish dates like "15 ene 2026" or "10/02/2026" or "04 jun 2026"
const parseMonth = (dateStr: string): string => {
  if (!dateStr) return "Otros";
  const str = dateStr.toLowerCase();
  
  if (str.includes("ene") || str.includes("/01/")) return "Ene";
  if (str.includes("feb") || str.includes("/02/")) return "Feb";
  if (str.includes("mar") || str.includes("/03/")) return "Mar";
  if (str.includes("abr") || str.includes("/04/")) return "Abr";
  if (str.includes("may") || str.includes("/05/")) return "May";
  if (str.includes("jun") || str.includes("/06/")) return "Jun";
  if (str.includes("jul") || str.includes("/07/")) return "Jul";
  if (str.includes("ago") || str.includes("/08/")) return "Ago";
  if (str.includes("sep") || str.includes("/09/")) return "Sep";
  if (str.includes("oct") || str.includes("/10/")) return "Oct";
  if (str.includes("nov") || str.includes("/11/")) return "Nov";
  if (str.includes("dic") || str.includes("/12/")) return "Dic";

  return "Otros";
};

export default function SearchStats({ candidacies }: SearchStatsProps) {
  // 1. Filter out candidacies that are just "guardado" if we only want to measure active sent applications for monthly stats,
  // but let's include all to give full visibility or make a toggle. Let's look at all.
  const total = candidacies.length;
  const applied = candidacies.filter(c => c.status !== "guardado");
  const totalApplied = applied.length;

  // Responses are any candidacy that has reached "entrevista", "ofrecido", or "rechazado"
  const responses = candidacies.filter(c => ["entrevista", "ofrecido", "rechazado"].includes(c.status));
  const totalResponses = responses.length;

  const responseRate = totalApplied > 0 
    ? Math.round((totalResponses / totalApplied) * 100) 
    : 0;

  const interviewsCount = candidacies.filter(c => c.status === "entrevista").length;
  const offersCount = candidacies.filter(c => c.status === "ofrecido").length;
  const rejectedCount = candidacies.filter(c => c.status === "rechazado").length;
  const pendingCount = candidacies.filter(c => c.status === "postulado").length;
  const savedCount = candidacies.filter(c => c.status === "guardado").length;

  // Offer Conversion rate (Offers / Total Applied)
  const offerRate = totalApplied > 0 
    ? Math.round((offersCount / totalApplied) * 100) 
    : 0;

  // --- CHART 1: Applications by Month ---
  const monthsOrder = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const monthlyDataMap: { [key: string]: { month: string; postulados: number; respuestas: number } } = {};
  
  monthsOrder.forEach(m => {
    monthlyDataMap[m] = { month: m, postulados: 0, respuestas: 0 };
  });

  candidacies.forEach(c => {
    if (c.status === "guardado") return; // exclude simple saved draft from monthly sent stats
    const m = parseMonth(c.appliedDate);
    if (monthlyDataMap[m]) {
      monthlyDataMap[m].postulados += 1;
      if (["entrevista", "ofrecido", "rechazado"].includes(c.status)) {
        monthlyDataMap[m].respuestas += 1;
      }
    }
  });

  // Keep only months with data to avoid an empty-looking graph, or show a sliding window
  const monthlyChartData = monthsOrder
    .map(m => monthlyDataMap[m])
    .filter((data, idx, arr) => {
      // Keep Ene to Jul if current time is Jul, or just filter months with at least one application
      return data.postulados > 0 || idx <= 6; // default window Jan-Jul
    });

  // --- CHART 2: Response Ratio (Pie Chart) ---
  const responsePieData = [
    { name: "Con Respuesta (Entrevistas/Ofertas/Feedback)", value: totalResponses, color: "#4f46e5" }, // Indigo
    { name: "Sin Respuesta (En espera)", value: pendingCount, color: "#cbd5e1" }, // Slate-300
  ];

  // --- CHART 3: Sector Distribution ---
  const sectorCounts: { [key: string]: number } = {};
  candidacies.forEach(c => {
    const sector = getSectorForJob(c.jobTitle, c.company);
    sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
  });

  const sectorChartData = Object.entries(sectorCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const PIE_COLORS = ["#4f46e5", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"];

  if (total === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <PieIcon className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-sm mx-auto">
          <h3 className="font-bold text-slate-800 text-sm">No hay suficientes datos estadísticos</h3>
          <p className="text-xs text-slate-500">
            Comienza a registrar postulaciones o realiza búsquedas con la IA para visualizar el progreso mensual y los ratios de conversión.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Key Performance Indicators (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Tasa de Respuesta</span>
            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800">{responseRate}%</span>
            {responseRate > 50 && (
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded flex items-center">
                Excelente
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">
            {totalResponses} respuestas de {totalApplied} postulaciones
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Tasa de Oferta</span>
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800">{offerRate}%</span>
            {offersCount > 0 && (
              <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                Éxito laboral
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">
            {offersCount} ofertas de empleo concretadas
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Procesos Activos</span>
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-slate-800">{interviewsCount + pendingCount}</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">
            {interviewsCount} entrevistas y {pendingCount} pendientes
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Registros</span>
            <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-slate-800">{total}</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">
            Incluyendo {savedCount} vacantes guardadas
          </p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Applications over time */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-500" />
              Aplicaciones Enviadas por Mes
            </h4>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Flujo cronológico de candidaturas activadas (excluye borradores guardados)
            </p>
          </div>

          <div className="h-64 mt-4 w-full text-xs">
            {totalApplied === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-medium italic">
                Aún no has enviado postulaciones (estado 'Postulado' o superior)
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPostulados" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorRespuestas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }}
                    labelClassName="font-bold text-indigo-300"
                  />
                  <Area 
                    type="monotone" 
                    name="Postulaciones" 
                    dataKey="postulados" 
                    stroke="#4f46e5" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorPostulados)" 
                  />
                  <Area 
                    type="monotone" 
                    name="Respuestas/Contacto" 
                    dataKey="respuestas" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRespuestas)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Response Ratio Doughnut */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-indigo-500" />
              Ratio de Respuesta
            </h4>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Porcentaje de feedback o llamadas recibidas tras enviar tu CV
            </p>
          </div>

          <div className="h-48 mt-4 relative flex items-center justify-center">
            {totalApplied === 0 ? (
              <span className="text-xs text-slate-400 italic">Sin datos de envío</span>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={responsePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {responsePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Percentage Display */}
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-black text-slate-800 leading-none">{responseRate}%</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Tasa</span>
                </div>
              </>
            )}
          </div>

          {/* Simple Chart Legend */}
          <div className="space-y-1.5 border-t border-slate-100 pt-3 text-[11px]">
            <div className="flex justify-between items-center text-slate-600">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span>
                <span>Con Respuesta</span>
              </div>
              <span className="font-bold text-slate-800">{totalResponses} ({responseRate}%)</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 bg-slate-300 rounded-full"></span>
                <span>Sin Respuesta aún</span>
              </div>
              <span className="font-bold text-slate-800">{pendingCount} ({100 - responseRate}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Distribution by Sectores */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-500" />
            Distribución por Sectores
          </h4>
          <p className="text-[11px] text-slate-400 font-medium mt-1">
            Categorización inteligente basada en los títulos de puestos y nombres de empresas indexadas
          </p>
        </div>

        <div className="h-64 mt-6 w-full text-xs">
          {sectorChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 font-medium italic">
              Registra candidaturas para clasificar tus sectores
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sectorChartData}
                layout="vertical"
                margin={{ top: 5, right: 15, left: 35, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  width={110}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }}
                />
                <Bar 
                  dataKey="value" 
                  name="Candidaturas" 
                  radius={[0, 6, 6, 0]}
                  maxBarSize={30}
                >
                  {sectorChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
