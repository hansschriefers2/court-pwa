"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { minToTimeStr, timeStrToMin } from "@/lib/utils/timeline";
import type { RecurringTraining } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAY_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  mode: "create" | "edit";
  id: string; // unused for "create"
  label: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

interface Props {
  trainings: RecurringTraining[];
  courtId: string;
  userId: string;
  username: string;
  onClose: () => void;
}

// ─── Inline form ──────────────────────────────────────────────────────────────

interface InlineFormProps {
  state: FormState;
  onChange: (s: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}

function InlineForm({ state, onChange, onSave, onCancel, saving, error }: InlineFormProps) {
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
      <input
        type="text"
        value={state.label}
        onChange={(e) => onChange({ ...state, label: e.target.value })}
        className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-violet-400"
      />
      <div className="mb-2 flex gap-1">
        {WEEKDAY_SHORT.map((day, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange({ ...state, dayOfWeek: i })}
            className={[
              "flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors",
              i === state.dayOfWeek
                ? "bg-violet-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100",
            ].join(" ")}
          >
            {day}
          </button>
        ))}
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <input
          type="time"
          value={state.startTime}
          onChange={(e) => onChange({ ...state, startTime: e.target.value })}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-violet-400"
        />
        <input
          type="time"
          value={state.endTime}
          onChange={(e) => onChange({ ...state, endTime: e.target.value })}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-violet-400"
        />
      </div>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-gray-300 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          Abbrechen
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="flex-1 rounded-lg bg-violet-500 py-1.5 text-sm font-medium text-white transition-colors hover:bg-violet-400 disabled:opacity-50"
        >
          {saving ? "…" : "Speichern"}
        </button>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ManageTrainingsModal({ trainings, courtId, userId, username, onClose }: Props) {
  const [formState, setFormState] = useState<FormState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...trainings].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.startMin - b.startMin
  );

  function openCreate() {
    setFormState({ mode: "create", id: "", label: "Training", dayOfWeek: 1, startTime: "18:00", endTime: "20:00" });
    setError(null);
  }

  function openEdit(t: RecurringTraining) {
    setFormState({ mode: "edit", id: t.id, label: t.label, dayOfWeek: t.dayOfWeek, startTime: minToTimeStr(t.startMin), endTime: minToTimeStr(t.endMin) });
    setError(null);
  }

  async function saveForm() {
    if (!formState) return;
    const startMin = timeStrToMin(formState.startTime);
    const endMin = timeStrToMin(formState.endTime);
    if (endMin <= startMin) { setError("Das Ende muss nach dem Start liegen."); return; }
    setSaving(true);
    setError(null);
    const fields = {
      label: formState.label.trim() || "Training",
      day_of_week: formState.dayOfWeek,
      start_min: startMin,
      end_min: endMin,
    };
    const { error: dbError } = formState.mode === "edit"
      ? await supabase.from("trainings").update(fields).eq("id", formState.id)
      : await supabase.from("trainings").insert({ ...fields, court_id: courtId, created_by_user_id: userId, created_by_username: username });
    if (dbError) { setError(dbError.message); setSaving(false); return; }
    setSaving(false);
    setFormState(null);
  }

  async function deleteTraining(id: string) {
    setDeletingId(id);
    await supabase.from("trainings").delete().eq("id", id);
    setDeletingId(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <div
        className="w-full max-w-sm rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Trainings verwalten"
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Trainings verwalten</h2>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {sorted.length === 0 && !formState && (
            <p className="py-2 text-center text-sm text-gray-400">Noch keine Trainings erstellt.</p>
          )}

          {sorted.map((t) => {
            const isEditing = formState?.mode === "edit" && formState.id === t.id;
            if (isEditing && formState) {
              return (
                <InlineForm
                  key={t.id}
                  state={formState}
                  onChange={setFormState}
                  onSave={saveForm}
                  onCancel={() => setFormState(null)}
                  saving={saving}
                  error={error}
                />
              );
            }
            return (
              <div key={t.id} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                <span className="shrink-0 rounded-md bg-violet-100 px-1.5 py-0.5 text-xs font-semibold text-violet-700">
                  {WEEKDAY_SHORT[t.dayOfWeek]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">{t.label}</p>
                  <p className="text-xs text-gray-400">{minToTimeStr(t.startMin)} – {minToTimeStr(t.endMin)}</p>
                </div>
                <button type="button" onClick={() => openEdit(t)} aria-label="Bearbeiten" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button type="button" disabled={deletingId === t.id} onClick={() => deleteTraining(t.id)} aria-label="Löschen" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                  </svg>
                </button>
              </div>
            );
          })}

          {/* Inline create form OR the add button */}
          {formState?.mode === "create" ? (
            <InlineForm
              state={formState}
              onChange={setFormState}
              onSave={saveForm}
              onCancel={() => setFormState(null)}
              saving={saving}
              error={error}
            />
          ) : (
            <button
              type="button"
              onClick={openCreate}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-violet-300 py-2.5 text-sm font-medium text-violet-600 transition-colors hover:bg-violet-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Neues Training
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

