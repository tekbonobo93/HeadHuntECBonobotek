import React, { useState } from "react";
import { 
  Briefcase, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Plus, 
  Search, 
  Filter, 
  SlidersHorizontal, 
  ArrowUpDown, 
  List, 
  Kanban, 
  Trash2, 
  Edit3, 
  Save, 
  ChevronDown, 
  ChevronUp,
  MapPin,
  FileText,
  History,
  TrendingUp,
  PlusCircle,
  X
} from "lucide-react";
import { Candidacy } from "../types";
import ApplicationsTracker from "./ApplicationsTracker";

interface CandidaciesHistoryProps {
  candidacies: Candidacy[];
  onUpdateCandidacy: (id: string, updatedFields: Partial<Candidacy>) => void;
  onDeleteCandidacy: (id: string) => void;
  onAddCustomCandidacy: (candidacy: Omit<Candidacy, 'id' | 'appliedDate' | 'history'>) => void;
}

const COLUMNS = [
  { id: "guardado", label: "Guardados", color: "border-neutral-300 text-neutral-600 bg-neutral-100" },
  { id: "postulado", label: "Postulados", color: "border-indigo-300 text-indigo-700 bg-indigo-50" },
  { id: "entrevista", label: "Entrevistas", color: "border-amber-300 text-amber-700 bg-amber-50" },
  { id: "ofrecido", label: "Ofrecidos/Ofertas", color: "border-green-300 text-green-700 bg-green-50" },
  { id: "rechazado", label: "No Seleccionados", color: "border-red-300 text-red-700 bg-red-50" }
] as const;

export default function CandidaciesHistory({
  candidacies,
  onUpdateCandidacy,
  onDeleteCandidacy,
  onAddCustomCandidacy
}: CandidaciesHistoryProps) {
  // Navigation layout state: 'kanban' or 'list'
  const [viewType, setViewType] = useState<'list' | 'kanban'>('list');
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationTypeFilter, setLocationTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "old" | "company" | "title">("recent");
  
  // Custom Application Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newLocationType, setNewLocationType] = useState<'remoto' | 'presencial' | 'hibrido'>("remoto");
  const [newStatus, setNewStatus] = useState<Candidacy['status']>("postulado");
  const [newNotes, setNewNotes] = useState("");

  // Edit notes state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState("");

  // Expanded details for application history log
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSubmitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newCompany) return;

    onAddCustomCandidacy({
      jobId: `manual-${Date.now()}`,
      jobTitle: newTitle,
      company: newCompany,
      location: newLocation || "No especificada",
      locationType: newLocationType,
      status: newStatus,
      notes: newNotes,
    });

    // Reset Form
    setNewTitle("");
    setNewCompany("");
    setNewLocation("");
    setNewLocationType("remoto");
    setNewStatus("postulado");
    setNewNotes("");
    setShowAddForm(false);
  };

  const startEditingNotes = (id: string, currentNotes: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingNotes(currentNotes);
  };

  const saveNotes = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateCandidacy(id, { notes: editingNotes });
    setEditingId(null);
  };

  const getStatusBadge = (status: Candidacy['status']) => {
    switch (status) {
      case "guardado":
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">📂 Guardado</span>;
      case "postulado":
        return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">✉️ Postulado</span>;
      case "entrevista":
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit animate-pulse">📅 Entrevista</span>;
      case "ofrecido":
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">🏆 Ofrecido</span>;
      case "rechazado":
        return <span className="bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">❌ No Seleccionado</span>;
    }
  };

  // Perform filtration and sorting of applications list
  const filteredAndSortedCandidacies = candidacies
    .filter((c) => {
      // 1. Text Search Filter
      const matchQuery = 
        c.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      // 2. Status Filter
      const matchStatus = statusFilter === "all" || c.status === statusFilter;

      // 3. Environment/Location Filter
      const matchLocationType = locationTypeFilter === "all" || c.locationType === locationTypeFilter;

      return matchQuery && matchStatus && matchLocationType;
    })
    .sort((a, b) => {
      // Helper to parse dates
      const parseDate = (dStr: string) => {
        try {
          if (dStr.includes("/")) {
            const parts = dStr.split("/");
            if (parts.length === 3) {
              return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
            }
          }
          return new Date(dStr).getTime();
        } catch (e) {
          return 0;
        }
      };

      if (sortBy === "recent") {
        return parseDate(b.appliedDate) - parseDate(a.appliedDate);
      }
      if (sortBy === "old") {
        return parseDate(a.appliedDate) - parseDate(b.appliedDate);
      }
      if (sortBy === "company") {
        return a.company.localeCompare(b.company);
      }
      if (sortBy === "title") {
        return a.jobTitle.localeCompare(b.jobTitle);
      }
      return 0;
    });

  // Numeric Stats for application summary
  const totalCount = candidacies.length;
  const inProgressCount = candidacies.filter(c => c.status === "postulado" || c.status === "entrevista").length;
  const offeredCount = candidacies.filter(c => c.status === "ofrecido").length;
  const rejectedCount = candidacies.filter(c => c.status === "rechazado").length;

  return (
    <div id="candidacies-module-container" className="space-y-6">
      
      {/* Overview Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200/80 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Historial Total</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-neutral-900">{totalCount}</span>
            <span className="text-xs text-neutral-500 font-medium">postulaciones</span>
          </div>
        </div>

        <div className="bg-indigo-50/40 rounded-xl border border-indigo-100 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">En Proceso Activo</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-indigo-700">{inProgressCount}</span>
            <span className="text-xs text-indigo-500 font-medium">vías activas</span>
          </div>
        </div>

        <div className="bg-emerald-50/40 rounded-xl border border-emerald-100 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Contratos/Ofertas</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-700">{offeredCount}</span>
            <span className="text-xs text-emerald-500 font-medium">¡Conseguido!</span>
          </div>
        </div>

        <div className="bg-red-50/40 rounded-xl border border-red-100 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">No Seleccionado</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-red-700">{rejectedCount}</span>
            <span className="text-xs text-neutral-500 font-medium">cerrados</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Layout Switcher, Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
        {/* Toggle layout buttons */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 w-full sm:w-auto">
          <button
            onClick={() => setViewType('list')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              viewType === 'list'
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <List className="w-4 h-4" />
            Ver Historial y Filtros
          </button>
          <button
            onClick={() => setViewType('kanban')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              viewType === 'kanban'
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Kanban className="w-4 h-4" />
            Tablero Kanban Pipeline
          </button>
        </div>

        {/* Add custom candidacy toggle */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full sm:w-auto px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm border-none"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          {showAddForm ? "Cerrar Formulario" : "Registrar Postulación Manual"}
        </button>
      </div>

      {/* Slide-down Form to Add Custom application */}
      {showAddForm && (
        <form onSubmit={handleSubmitCustom} className="bg-neutral-50 rounded-xl border border-neutral-200 p-5 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
            <h4 className="font-bold text-xs text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-indigo-500" />
              Registrar Nueva Postulación Externa
            </h4>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-500 uppercase">Título de la Vacante *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ej: Ingeniero de Software React / Node"
                className="w-full text-xs border border-neutral-200 rounded-lg p-2.5 bg-white focus:outline-none focus:border-indigo-500 font-medium text-neutral-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-500 uppercase">Empresa / Organización *</label>
              <input
                type="text"
                required
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="Ej: MercadoLibre, Globant"
                className="w-full text-xs border border-neutral-200 rounded-lg p-2.5 bg-white focus:outline-none focus:border-indigo-500 font-medium text-neutral-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-500 uppercase">Ubicación física de la oficina</label>
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Ej: Buenos Aires, Remoto (EE.UU.)"
                className="w-full text-xs border border-neutral-200 rounded-lg p-2.5 bg-white focus:outline-none focus:border-indigo-500 font-medium text-neutral-800"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Modalidad</label>
                <select
                  value={newLocationType}
                  onChange={(e) => setNewLocationType(e.target.value as any)}
                  className="w-full text-xs border border-neutral-200 rounded-lg p-2.5 bg-white focus:outline-none font-semibold text-neutral-800"
                >
                  <option value="remoto">🌐 Remoto</option>
                  <option value="hibrido">🏢 Híbrido</option>
                  <option value="presencial">📍 Presencial</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Fase Inicial</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full text-xs border border-neutral-200 rounded-lg p-2.5 bg-white focus:outline-none font-semibold text-neutral-800"
                >
                  <option value="guardado">📂 Guardado (Aspiración)</option>
                  <option value="postulado">✉️ Postulado (CV enviado)</option>
                  <option value="entrevista">📅 Entrevista (Contacto directo)</option>
                  <option value="ofrecido">🏆 Ofrecido (Propuesta hecha)</option>
                  <option value="rechazado">❌ Rechazado (Descartado)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-500 uppercase">Notas, Enlace de Postulación, Salario Estimado u Observaciones</label>
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Escribe anotaciones importantes..."
              rows={3}
              className="w-full text-xs border border-neutral-200 rounded-lg p-2.5 bg-white focus:outline-none focus:border-indigo-500 resize-none text-neutral-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200/50">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-neutral-200 rounded-lg text-xs font-bold text-neutral-500 hover:bg-neutral-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Registrar en Historial
            </button>
          </div>
        </form>
      )}

      {/* RENDER VIEW ACCORDING TO VIEWTYPE */}
      {viewType === 'kanban' ? (
        <ApplicationsTracker
          candidacies={candidacies}
          onUpdateCandidacy={onUpdateCandidacy}
          onDeleteCandidacy={onDeleteCandidacy}
          onAddCustomCandidacy={onAddCustomCandidacy}
        />
      ) : (
        <div className="space-y-4">
          {/* Advanced Filtering Panel */}
          <div className="bg-white rounded-xl border border-neutral-200/80 p-4 shadow-sm space-y-4">
            <div className="text-[11px] font-bold text-neutral-700 flex items-center gap-1.5 uppercase tracking-wider border-b border-neutral-100 pb-2">
              <Filter className="w-4 h-4 text-indigo-500" />
              Filtros de Búsqueda y Organización del Historial
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Text Search Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Filtrar por texto</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Empresa, vacante, notas..."
                    className="w-full text-xs pl-9 pr-3 py-2 border border-neutral-200 rounded-lg bg-neutral-50/50 focus:outline-none focus:border-indigo-500 font-medium text-neutral-800"
                  />
                </div>
              </div>

              {/* Status Filter Dropdown */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Fase de Selección</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full text-xs bg-neutral-50/50 border border-neutral-200 rounded-lg p-2 font-semibold text-neutral-800 focus:outline-none"
                >
                  <option value="all">📁 Todas las etapas</option>
                  <option value="guardado">📂 Guardados</option>
                  <option value="postulado">✉️ Postulados</option>
                  <option value="entrevista">📅 En Entrevistas</option>
                  <option value="ofrecido">🏆 Ofrecidos/Ofertas</option>
                  <option value="rechazado">❌ No Seleccionados</option>
                </select>
              </div>

              {/* Environment Filter Dropdown */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Modalidad de Trabajo</label>
                <select
                  value={locationTypeFilter}
                  onChange={(e) => setLocationTypeFilter(e.target.value)}
                  className="w-full text-xs bg-neutral-50/50 border border-neutral-200 rounded-lg p-2 font-semibold text-neutral-800 focus:outline-none"
                >
                  <option value="all">🌍 Cualquier modalidad</option>
                  <option value="remoto">🌐 Remoto</option>
                  <option value="hibrido">🏢 Híbrido</option>
                  <option value="presencial">📍 Presencial</option>
                </select>
              </div>

              {/* Sorting Selection Dropdown */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Ordenar por</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full text-xs bg-neutral-50/50 border border-neutral-200 rounded-lg p-2 font-semibold text-neutral-800 focus:outline-none"
                >
                  <option value="recent">🗓️ Más recientes primero</option>
                  <option value="old">🗓️ Más antiguas primero</option>
                  <option value="company">🏢 Empresa (A-Z)</option>
                  <option value="title">💼 Puesto (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Clear filters trigger */}
            {(searchQuery || statusFilter !== "all" || locationTypeFilter !== "all") && (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setLocationTypeFilter("all");
                  }}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer bg-transparent border-none"
                >
                  Limpiar Filtros Activos
                </button>
              </div>
            )}
          </div>

          {/* Results List View Table-styled Container */}
          <div className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden shadow-sm">
            {filteredAndSortedCandidacies.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <FileText className="w-10 h-10 text-neutral-300 stroke-[1.5]" />
                <div>
                  <h4 className="text-xs font-bold text-neutral-700">No se encontraron candidaturas</h4>
                  <p className="text-[11px] text-neutral-500 mt-1 max-w-md">
                    Modifica tus filtros de búsqueda o registra una postulación usando el botón del panel superior para centralizar tu historial laboral.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {/* List Items */}
                {filteredAndSortedCandidacies.map((c) => {
                  const isExpanded = expandedId === c.id;
                  
                  return (
                    <div 
                      key={c.id} 
                      className={`hover:bg-neutral-50/40 transition-colors ${
                        isExpanded ? "bg-indigo-50/10" : ""
                      }`}
                    >
                      {/* Main compact row */}
                      <div 
                        onClick={() => setExpandedId(isExpanded ? null : c.id)}
                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-600 font-bold flex items-center justify-center text-xs border border-neutral-200 shrink-0 mt-0.5">
                            {c.company.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-bold text-xs text-neutral-900">{c.jobTitle}</h4>
                              <span className="text-[10px] bg-neutral-100 text-neutral-600 font-bold px-2 py-0.5 rounded-md border border-neutral-200 capitalize">
                                {c.locationType}
                              </span>
                            </div>
                            <p className="text-[11px] text-indigo-600 font-bold mt-0.5">{c.company}</p>
                            <p className="text-[10px] text-neutral-400 font-medium flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {c.location}
                            </p>
                          </div>
                        </div>

                        {/* Middle status section */}
                        <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
                          {getStatusBadge(c.status)}

                          <div className="hidden sm:block text-right">
                            <span className="text-[10px] text-neutral-400 block font-bold">Fecha de Registro</span>
                            <span className="text-xs font-medium text-neutral-700 font-mono">{c.appliedDate}</span>
                          </div>

                          <div className="text-neutral-400 hover:text-neutral-600 p-1">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded View: History logs, detail editor, delete candidacy */}
                      {isExpanded && (
                        <div className="px-6 pb-5 pt-1 border-t border-dashed border-neutral-100 space-y-4 animate-in fade-in duration-200">
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                            
                            {/* Left Column: Interactive status switcher and rich notes */}
                            <div className="lg:col-span-7 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Etapa Actual de Selección</label>
                                  <select
                                    value={c.status}
                                    onChange={(e) => onUpdateCandidacy(c.id, { status: e.target.value as any })}
                                    className="w-full text-xs border border-neutral-200 rounded-lg p-2 bg-neutral-50 text-neutral-700 font-bold focus:outline-none"
                                  >
                                    <option value="guardado">📂 Guardado</option>
                                    <option value="postulado">✉️ Postulado</option>
                                    <option value="entrevista">📅 En Entrevista</option>
                                    <option value="ofrecido">🏆 Ofrecido</option>
                                    <option value="rechazado">❌ No Seleccionado</option>
                                  </select>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Modalidad de Trabajo</label>
                                  <select
                                    value={c.locationType}
                                    onChange={(e) => onUpdateCandidacy(c.id, { locationType: e.target.value as any })}
                                    className="w-full text-xs border border-neutral-200 rounded-lg p-2 bg-neutral-50 text-neutral-700 font-bold focus:outline-none"
                                  >
                                    <option value="remoto">🌐 Remoto</option>
                                    <option value="hibrido">🏢 Híbrido</option>
                                    <option value="presencial">📍 Presencial</option>
                                  </select>
                                </div>
                              </div>

                              {/* Editable notes block */}
                              <div className="bg-neutral-50 border border-neutral-200/50 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider">Notas de Seguimiento y Salario</span>
                                  {editingId !== c.id ? (
                                    <button
                                      onClick={(e) => startEditingNotes(c.id, c.notes || "", e)}
                                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-bold cursor-pointer bg-transparent border-none"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                      Editar Notas
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => saveNotes(c.id, e)}
                                      className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1 font-bold cursor-pointer bg-transparent border-none"
                                    >
                                      <Save className="w-3.5 h-3.5" />
                                      Guardar
                                    </button>
                                  )}
                                </div>

                                {editingId === c.id ? (
                                  <textarea
                                    value={editingNotes}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => setEditingNotes(e.target.value)}
                                    rows={3}
                                    className="w-full text-xs p-2 border border-indigo-200 rounded-lg focus:outline-none bg-white text-neutral-800"
                                  />
                                ) : (
                                  <p className="text-xs text-neutral-600 leading-relaxed italic whitespace-pre-line break-words bg-white border border-neutral-100 p-2.5 rounded-lg">
                                    {c.notes || "No has añadido notas para esta postulación laboral. Utiliza esta sección para registrar personas de contacto, salarios acordados o el enlace del empleo."}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Right Column: Visual timeline history track */}
                            <div className="lg:col-span-5 space-y-3 border-l border-neutral-100 pl-4">
                              <h5 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
                                <History className="w-3.5 h-3.5 text-neutral-400" />
                                Historial Cronológico
                              </h5>
                              
                              <div className="relative pl-4 border-l border-neutral-200 space-y-3">
                                {/* Current state step */}
                                <div className="relative">
                                  <div className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white shadow-xs"></div>
                                  <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">FASE ACTUAL: {c.status.toUpperCase()}</div>
                                  <div className="text-[9px] text-neutral-400 font-mono mt-0.5">Última actualización guardada en local</div>
                                </div>

                                {/* Base application registry log */}
                                <div className="relative">
                                  <div className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full bg-neutral-300 border-2 border-white shadow-xs"></div>
                                  <div className="text-[10px] font-bold text-neutral-700">CREACIÓN DE PROCESO</div>
                                  <div className="text-[9px] text-neutral-400 font-mono mt-0.5">Registrado el {c.appliedDate}</div>
                                </div>
                              </div>

                              {/* Danger Action: Delete candidacy completely */}
                              <div className="pt-4 border-t border-neutral-100 flex justify-end">
                                <button
                                  onClick={() => {
                                    if (window.confirm(`¿Estás seguro de que deseas eliminar la candidatura de "${c.jobTitle}" en "${c.company}"? Esto quitará el progreso del tracker.`)) {
                                      onDeleteCandidacy(c.id);
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold text-red-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Eliminar de Historial
                                </button>
                              </div>
                            </div>

                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
