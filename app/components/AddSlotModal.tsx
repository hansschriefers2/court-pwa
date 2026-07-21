"use client";

import { useAddSlot } from "@/lib/hooks/useAddSlot";
import { formatDateLabel } from "@/lib/utils/timeline";
import type { Court, TimeSlot } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATION_OPTIONS = [
  { label: "30m", value: 30 },
  { label: "1h", value: 60 },
  { label: "90m", value: 90 },
  { label: "2h", value: 120 },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  court: Court;
  username: string;
  userId: string;
  date: Date;
  onClose: () => void;
  editSlot?: TimeSlot;
}

export default function AddSlotModal({ court, username, userId, date, onClose, editSlot }: Props) {
  const { startTime, setStartTime, duration, setDuration, saving, error, submit } =
    useAddSlot({ courtId: court.id, username, userId, date, onSuccess: onClose, editSlot });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">
            {editSlot ? "Slot bearbeiten" : "Neuer Slot"}
          </h2>
          <span className="text-sm text-gray-400">{formatDateLabel(date)}</span>
        </div>

        {/* Start time */}
        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs font-medium text-gray-500">
            Startzeit
          </span>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-lime-400"
          />
        </label>

        {/* Duration */}
        <div className="mb-5">
          <span className="mb-1.5 block text-xs font-medium text-gray-500">
            Dauer
          </span>
          <div className="grid grid-cols-4 gap-2">
            {DURATION_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => setDuration(value)}
                className={[
                  "rounded-lg border py-2 text-sm font-medium transition-colors",
                  duration === value
                    ? "border-lime-400 bg-lime-400 text-gray-900"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-200">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="flex-1 rounded-lg bg-lime-400 py-2 text-sm font-medium text-gray-900 hover:bg-lime-300 disabled:opacity-40 transition-colors"
          >
            {saving ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
