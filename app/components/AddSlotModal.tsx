"use client";

import { useAddSlot } from "@/lib/hooks/useAddSlot";
import { formatDateLabel } from "@/lib/utils/timeline";
import type { Court, TimeSlot } from "@/lib/types";

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
  const { startTime, setStartTime, endTime, setEndTime, saving, error, submit } =
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
            Start
          </span>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-lime-400"
          />
        </label>

        {/* End time */}
        <label className="mb-5 block">
          <span className="mb-1.5 block text-xs font-medium text-gray-500">
            Ende
          </span>
          <input
            type="time"
            value={endTime}
            min={startTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-lime-400"
          />
        </label>

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
