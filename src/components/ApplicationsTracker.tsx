import React, { useState } from "react";
import { Plus, Briefcase, Calendar, FileText, ChevronRight, CheckCircle, Clock, Trash2, Edit3, XCircle, AlertCircle, Save, Bell, X } from "lucide-react";
import { Candidacy } from "../types";

interface ApplicationsTrackerProps {
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

export default function ApplicationsTracker({
  candidacies,
  onUpdateCandidacy,
  onDeleteCandidacy,
  onAddCustomCandidacy
}: ApplicationsTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newLocationType, setNewLocationType] = useState<'remoto' | 'presencial' | 'hibrido'>("remoto");
  const [newStatus, setNewStatus] = useState<Candidacy['status']>("postulado");
  const [newNotes, setNewNotes] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState("");

  const [reminderEditingId, setReminderEditingId] = useState<string | null>(null);
  const [tempReminderDate, setTempReminderDate] = useState<string>("");

  const formatReminderDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return dateStr;
    }
  };

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

  const startEditingNotes = (id: string, currentNotes: string) => {
    setEditingId(id);
    setEditingNotes(currentNotes);
  };

  const saveNotes = (id: string) => {
    onUpdateCandidacy(id, { notes: editingNotes });
    setEditingId(null);
  };

  const getStatusIcon = (status: Candidacy['status']) => {
    switch (status) {
      case "guardado": return <Clock className="w-4 h-4 text-neutral-500" />;
      case "postulado": return <Briefcase className="w-4 h-4 text-indigo-500" />;
      case "entrevista": return <Calendar className="w-4 h-4 text-amber-500 animate-pulse" />;
      case "ofrecido": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "rechazado": return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  // Stats calculations
  const totalCount = candidacies.length;
  const interviewingCount = candidacies.filter(c => c.status === "entrevista").length;
  const offeredCount = candidacies.filter(c => c.status === "ofrecido").length;
  const appliedCount = candidacies.filter(c => c.status === "postulado").length;

  return (
    <div id="applications-tracker-container" className="space-y-6">
      {/* Stats Cards Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200/80 p-4 shadow-sm">
          <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Total Procesos</p>
          <p className="text-3xl font-black text-neutral-900 mt-1">{totalCount}</p>
          <span className="text-[10px] text-neutral-500 font-medium block mt-1">Guardados y postulaciones activas</span>
        </div>
        <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 p-4 shadow-sm">
          <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider">Postulados</p>
          <p className="text-3xl font-black text-indigo-700 mt-1">{appliedCount}</p>
          <span className="text-[10px] text-indigo-600 font-medium block mt-1">CV enviado y en espera</span>
        </div>
        <div className="bg-amber-50/50 rounded-xl border border-amber-100 p-4 shadow-sm">
          <p className="text-xs text-amber-500 font-semibold uppercase tracking-wider">En Entrevistas</p>
          <p className="text-3xl font-black text-amber-700 mt-1">{interviewingCount}</p>
          <span className="text-[10px] text-amber-600 font-medium block mt-1">Procesos de selección activos</span>
        </div>
        <div className="bg-green-50/50 rounded-xl border border-green-100 p-4 shadow-sm">
          <p className="text-xs text-green-500 font-semibold uppercase tracking-wider">Ofertas Recibidas</p>
          <p className="text-3xl font-black text-green-700 mt-1">{offeredCount}</p>
          <span className="text-[10px] text-green-600 font-medium block mt-1">¡Éxito! Contratos ofrecidos</span>
        </div>
      </div>

      {/* Button to toggle add form */}
      <div className="flex justify-between items-center">
        <h3 className="text-md font-semibold text-neutral-800">Tus Candidaturas Centralizadas</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Añadir Postulación Manual
        </button>
      </div>

      {/* Add Custom Application Form */}
      {showAddForm && (
        <form onSubmit={handleSubmitCustom} className="bg-neutral-50 rounded-xl border border-neutral-200 p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
            <h4 className="font-semibold text-sm text-neutral-800">Añadir Postulación Encontrada Fuera de la Web</h4>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-700"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500">Título del Puesto *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ej: React Developer Senior"
                className="w-full text-xs border border-neutral-200 rounded-lg p-2.5 bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500">Nombre de la Empresa *</label>
              <input
                type="text"
                required
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="Ej: Globant, Startup Inc."
                className="w-full text-xs border border-neutral-200 rounded-lg p-2.5 bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500">Ubicación (Opcional)</label>
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Ej: Madrid, Lima, Remoto"
                className="w-full text-xs border border-neutral-200 rounded-lg p-2.5 bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-500">Entorno</label>
                <select
                  value={newLocationType}
                  onChange={(e) => setNewLocationType(e.target.value as any)}
                  className="w-full text-xs border border-neutral-200 rounded-lg p-2.5 bg-white focus:outline-none"
                >
                  <option value="remoto">Remoto</option>
                  <option value="hibrido">Híbrido</option>
                  <option value="presencial">Presencial</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-500">Estado Inicial</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full text-xs border border-neutral-200 rounded-lg p-2.5 bg-white focus:outline-none"
                >
                  <option value="guardado">Guardado</option>
                  <option value="postulado">Postulado</option>
                  <option value="entrevista">Entrevista</option>
                  <option value="ofrecido">Ofrecido</option>
                  <option value="rechazado">Rechazado</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-500">Notas Iniciales (Salario pactado, fecha de contacto, etc.)</label>
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Escribe detalles adicionales..."
              rows={2}
              className="w-full text-xs border border-neutral-200 rounded-lg p-2.5 bg-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
            >
              Registrar Postulación
            </button>
          </div>
        </form>
      )}

      {/* Board Pipeline Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {COLUMNS.map((column) => {
          const columnCandidacies = candidacies.filter(c => c.status === column.id);

          return (
            <div key={column.id} className="flex flex-col bg-neutral-50 rounded-xl border border-neutral-200/60 p-3 min-h-[400px]">
              {/* Column Title */}
              <div className={`border-b pb-2 mb-3 flex items-center justify-between`}>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full border ${column.color.split(' ')[0]}`}></div>
                  <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">{column.label}</span>
                </div>
                <span className="text-xs bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded-full font-bold">
                  {columnCandidacies.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="flex-grow space-y-3 overflow-y-auto">
                {columnCandidacies.length === 0 ? (
                  <div className="h-28 border border-dashed border-neutral-200 rounded-lg flex flex-col items-center justify-center text-center p-3">
                    <span className="text-[10px] font-medium text-neutral-400">Sin procesos</span>
                  </div>
                ) : (
                  columnCandidacies.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white border border-neutral-200 hover:border-indigo-200 rounded-xl p-3.5 shadow-sm space-y-3 transition-all"
                    >
                      <div>
                        <h5 className="font-bold text-xs text-neutral-900 leading-tight line-clamp-1">{c.jobTitle}</h5>
                        <p className="text-[11px] font-medium text-neutral-500 leading-normal line-clamp-1">{c.company}</p>
                        <p className="text-[10px] font-medium text-neutral-400 mt-1 leading-normal">
                          {c.location} ({c.locationType})
                        </p>
                      </div>

                      {/* Dropdown status switcher for easy moving */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">Cambiar Estado</label>
                        <select
                          value={c.status}
                          onChange={(e) => onUpdateCandidacy(c.id, { status: e.target.value as any })}
                          className="w-full text-[10px] border border-neutral-200 rounded p-1.5 bg-neutral-50 text-neutral-700 font-semibold focus:outline-none"
                        >
                          <option value="guardado">Guardado</option>
                          <option value="postulado">Postulado</option>
                          <option value="entrevista">Entrevista</option>
                          <option value="ofrecido">Ofrecido</option>
                          <option value="rechazado">Rechazado</option>
                        </select>
                      </div>

                      {/* Notes / Edit Notes section */}
                      <div className="bg-neutral-50 border border-neutral-100 rounded-lg p-2 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold uppercase text-neutral-400">Notas / Seguimiento</span>
                          {editingId !== c.id ? (
                            <button
                              onClick={() => startEditingNotes(c.id, c.notes || "")}
                              className="text-[10px] text-neutral-500 hover:text-indigo-600 flex items-center gap-0.5 font-semibold"
                            >
                              <Edit3 className="w-3 h-3" />
                              Editar
                            </button>
                          ) : (
                            <button
                              onClick={() => saveNotes(c.id)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 font-bold"
                            >
                              <Save className="w-3 h-3" />
                              Guardar
                            </button>
                          )}
                        </div>

                        {editingId === c.id ? (
                          <textarea
                            value={editingNotes}
                            onChange={(e) => setEditingNotes(e.target.value)}
                            rows={2}
                            className="w-full text-[10px] p-1 border border-indigo-200 rounded focus:outline-none bg-white"
                          />
                        ) : (
                          <p className="text-[10px] text-neutral-600 leading-relaxed italic break-words">
                            {c.notes || "Sin notas todavía..."}
                          </p>
                        )}
                      </div>

                      {/* Reminder / "Recordar luego" Section */}
                      <div className="bg-neutral-50/50 border border-neutral-100/80 rounded-lg p-2 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold uppercase text-neutral-400 flex items-center gap-1">
                            <Bell className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                            Recordatorio
                          </span>
                          {reminderEditingId !== c.id ? (
                            <button
                              type="button"
                              onClick={() => {
                                setReminderEditingId(c.id);
                                const now = new Date();
                                // Add 1 hour and format as local datetime string
                                now.setHours(now.getHours() + 1);
                                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                                const defaultVal = now.toISOString().slice(0, 16);
                                setTempReminderDate(c.reminderDate || defaultVal);
                              }}
                              className="text-[10px] text-indigo-600 hover:text-indigo-750 flex items-center gap-0.5 font-bold cursor-pointer transition-colors"
                            >
                              {c.reminderDate ? "Cambiar" : "Recordar luego"}
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateCandidacy(c.id, { reminderDate: tempReminderDate });
                                  setReminderEditingId(null);
                                }}
                                className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold cursor-pointer"
                              >
                                Guardar
                              </button>
                              <span className="text-neutral-300 text-[10px]">|</span>
                              <button
                                type="button"
                                onClick={() => setReminderEditingId(null)}
                                className="text-[10px] text-neutral-400 hover:text-neutral-500 cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>

                        {reminderEditingId === c.id ? (
                          <div className="flex items-center gap-1 mt-1">
                            <input
                              type="datetime-local"
                              value={tempReminderDate}
                              onChange={(e) => setTempReminderDate(e.target.value)}
                              className="text-[10px] border border-neutral-200 rounded p-1 focus:outline-none focus:border-indigo-500 bg-white text-neutral-800 flex-1 min-w-0"
                            />
                            {c.reminderDate && (
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateCandidacy(c.id, { reminderDate: undefined });
                                  setReminderEditingId(null);
                                }}
                                className="text-[10px] text-red-500 hover:text-red-650 font-bold px-1 transition-colors shrink-0"
                                title="Eliminar recordatorio"
                              >
                                Borrar
                              </button>
                            )}
                          </div>
                        ) : (
                          c.reminderDate ? (
                            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-md p-1.5">
                              <div className="flex items-center gap-1 text-[10px] text-indigo-800 font-medium leading-none">
                                <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                                <span className="line-clamp-1">{formatReminderDate(c.reminderDate)}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => onUpdateCandidacy(c.id, { reminderDate: undefined })}
                                className="text-neutral-400 hover:text-red-500 transition-colors shrink-0"
                                title="Eliminar recordatorio"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <p className="text-[9px] text-neutral-400 leading-normal italic">
                              Sin programar
                            </p>
                          )
                        )}
                      </div>

                      {/* Action buttons (Delete) */}
                      <div className="flex justify-between items-center pt-2 border-t border-neutral-100">
                        <span className="text-[9px] text-neutral-400 font-medium">
                          Agregado: {c.appliedDate}
                        </span>
                        <button
                          onClick={() => onDeleteCandidacy(c.id)}
                          className="text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                          title="Eliminar candidatura de la lista"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
