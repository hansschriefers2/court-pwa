"use client";

import { useState } from "react";
import { useUsername } from "@/lib/hooks/useUsername";
import { useSlots } from "@/lib/hooks/useSlots";
import { supabase } from "@/lib/supabase/client";
import CourtScheduler from "@/app/components/CourtScheduler";
import UsernameModal from "@/app/components/UsernameModal";
import AddSlotModal from "@/app/components/AddSlotModal";
import SlotActionModal from "@/app/components/SlotActionModal";
import type { Court, TimeSlot } from "@/lib/types";

// Cookie handling is encapsulated in `useUsername()`.

// ─── Types ────────────────────────────────────────────────────────────────────

// (SlotRow type removed — slot row mapping is handled inside `useSlots`.)

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  court: Court;
}

export default function CourtView({ court }: Props) {
  const { username, inputName, setInputName, confirm, ready } = useUsername();
  const { slots, loading, error, currentDate, handleDateChange, removeSlot } = useSlots(
    court.id,
    username
  );
  const [addingSlot, setAddingSlot] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);

  if (!ready) return null;

  if (!username) {
    return (
      <UsernameModal
        courtName={court.name}
        inputName={inputName}
        onChange={setInputName}
        onConfirm={confirm}
      />
    );
  }

  async function deleteSlot(id: string) {
    const { error: deleteError } = await supabase.from("slots").delete().eq("id", id);
    if (deleteError) {
      // Keep UI consistent with the DB; consider surfacing this to the user.
      console.error(deleteError);
      return;
    }
    removeSlot(id);
  }

  return (
    <>
      {error && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 shadow">
          Fehler beim Laden: {error}
        </div>
      )}
      <CourtScheduler
        slots={loading ? [] : slots}
        onDateChange={handleDateChange}
        onAddSlot={() => setAddingSlot(true)}
        username={username}
        onSlotTap={(slot) => setSelectedSlot(slot)}
      />
      {selectedSlot && (
        <SlotActionModal
          slot={selectedSlot}
          onEdit={() => {
            setEditingSlot(selectedSlot);
            setSelectedSlot(null);
          }}
          onDelete={async () => {
            await deleteSlot(selectedSlot.id);
            setSelectedSlot(null);
          }}
          onClose={() => setSelectedSlot(null)}
        />
      )}
      {(addingSlot || editingSlot) && (
        <AddSlotModal
          court={court}
          username={username}
          date={currentDate}
          editSlot={editingSlot ?? undefined}
          onClose={() => {
            setAddingSlot(false);
            setEditingSlot(null);
          }}
        />
      )}
    </>
  );
}
