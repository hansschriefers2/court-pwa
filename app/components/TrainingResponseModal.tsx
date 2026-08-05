"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { localDateStr, minToTimeStr } from "@/lib/utils/timeline";
import type { RecurringTraining } from "@/lib/types";

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  training: RecurringTraining;
  date: Date;
  userId: string;
  username: string;
  onClose: () => void;
}

export default function TrainingResponseModal({ training, date, userId, username, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeLabel = `${minToTimeStr(training.startMin)} – ${minToTimeStr(training.endMin)}`;

  async function respond(type: "join" | "tentative") {
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from("slots").insert({
      court_id: training.courtId,
      user_name: username,
      user_id: userId,
      date: localDateStr(date),
      start_min: training.startMin,
      end_min: training.endMin,
      tentative: type === "tentative",
      training_id: training.id,
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
        aria-labelledby="training-response-title"
      >
        {/* Header */}
        <div className="mb-1 flex items-center gap-2.5">
          <span className="h-3 w-3 shrink-0 rounded-full bg-violet-500" aria-hidden="true" />
          <h2 id="training-response-title" className="text-base font-semibold text-gray-800">
            {training.label}
          </h2>
        </div>
        <p className="mb-5 text-sm text-gray-500">{timeLabel} · Wöchentlich</p>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => respond("join")}
            className="w-full rounded-lg bg-lime-400 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:bg-lime-300 disabled:opacity-50"
          >
            Ich bin dabei
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => respond("tentative")}
            className="w-full rounded-lg bg-amber-100 py-2.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-200 disabled:opacity-50"
          >
            Vielleicht
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Nicht dabei
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg py-2.5 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
