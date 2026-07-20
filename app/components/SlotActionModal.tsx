"use client";

import { minToTimeStr } from "@/lib/utils/timeline";
import type { TimeSlot } from "@/lib/types";

interface Props {
  slot: TimeSlot;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function SlotActionModal({ slot, onEdit, onDelete, onClose }: Props) {
  const timeLabel = `${minToTimeStr(slot.startMin)} – ${minToTimeStr(slot.endMin)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <h2 className="mb-1 text-base font-semibold text-gray-800">{slot.name}</h2>
        <p className="mb-5 text-sm text-gray-500">{timeLabel}</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="w-full rounded-lg bg-lime-400 py-2 text-sm font-medium text-gray-900 hover:bg-lime-300 transition-colors"
          >
            Bearbeiten
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="w-full rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors"
          >
            Löschen
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
