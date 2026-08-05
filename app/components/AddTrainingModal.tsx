"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { minToTimeStr, timeStrToMin } from "@/lib/utils/timeline";
import type { Court } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

// JS Date.getDay() convention: 0 = Sunday
const WEEKDAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  court: Court;
  userId: string;
  username: string;
  onClose: () => void;
}

export default function AddTrainingModal({ court, userId, username, onClose }: Props) {
  const [label, setLabel] = useState("Training");
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const startMin = timeStrToMin(startTime);
    const endMin = timeStrToMin(endTime);
    if (endMin <= startMin) {
      setError("Das Ende muss nach dem Start liegen.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from("trainings").insert({
      court_id: court.id,
      created_by_user_id: userId,
      created_by_username: username,
      label: label.trim() || "Training",
      day_of_week: dayOfWeek,
      start_min: startMin,
      end_min: endMin,
    });
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <div
        className="w-full max-w-sm rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Neues Training"
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Neues Training</h2>
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

        {/* Name */}
        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs font-medium text-gray-500">Name</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-400"
          />
        </label>

        {/* Weekday picker */}
        <div className="mb-4">
          <span className="mb-1.5 block text-xs font-medium text-gray-500">Wochentag</span>
          <div className="flex gap-1">
            {WEEKDAY_LABELS.map((day, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setDayOfWeek(i)}
                className={[
                  "flex-1 rounded-lg py-2 text-xs font-medium transition-colors",
                  i === dayOfWeek
                    ? "bg-violet-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                ].join(" ")}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Time range */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-gray-500">Von</span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-400"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-gray-500">Bis</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-400"
            />
          </label>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button
          type="button"
          disabled={saving}
          onClick={submit}
          className="w-full rounded-lg bg-violet-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-400 disabled:opacity-50"
        >
          {saving ? "Speichern…" : "Training erstellen"}
        </button>
      </div>
    </div>
  );
}
