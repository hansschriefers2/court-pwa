"use client";

import { useState } from "react";
import Link from "next/link";
import { useUsername } from "@/lib/hooks/useUsername";
import { useSlots } from "@/lib/hooks/useSlots";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
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
  const { username, userId, inputName, setInputName, confirm, ready } = useUsername();
  const { slots, loading, error, currentDate, handleDateChange, removeSlot } = useSlots(
    court.id,
    username
  );
  const [addingSlot, setAddingSlot] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  // Hook must be called before any early return (rules of hooks).
  // Pass !!username so the auto-subscribe prompt only fires once the user has a name.
  const { isSupported, isSubscribed, isLoading: notifyLoading, isDenied, toggle: toggleNotify } =
    usePushNotifications(court.id, userId, !!username);

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
    <div className="flex h-dvh flex-col">
      {/* ── App bar ────────────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center gap-1 bg-white px-2 shadow-sm">
        <Link
          href="/"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 active:bg-gray-200"
          aria-label="Zurück zur Übersicht"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>

        <h1 className="flex-1 truncate px-1 text-base font-semibold text-gray-900">{court.name}</h1>

        {isSupported && (
          <button
            onClick={isDenied ? undefined : toggleNotify}
            disabled={notifyLoading || isDenied}
            aria-label={
              isDenied
                ? "Benachrichtigungen sind im Browser blockiert"
                : isSubscribed
                ? "Benachrichtigungen deaktivieren"
                : "Benachrichtigungen aktivieren"
            }
            title={
              isDenied
                ? "Im Browser blockiert – bitte in den Browser-Einstellungen erlauben"
                : isSubscribed
                ? "Benachrichtigungen deaktivieren"
                : "Bei neuen Slots benachrichtigt werden"
            }
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all active:scale-95",
              isDenied
                ? "cursor-not-allowed text-gray-300"
                : isSubscribed
                ? "bg-lime-400 text-gray-900"
                : "text-gray-400 hover:bg-gray-100 hover:text-gray-700",
            ].join(" ")}
          >
            {isSubscribed ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M12 22a2 2 0 002-2h-4a2 2 0 002 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 00-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            )}
          </button>
        )}
      </header>

      {error && (
        <div className="fixed top-16 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 shadow">
          Fehler beim Laden: {error}
        </div>
      )}

      {/* Scheduler fills the remaining height */}
      <div className="min-h-0 flex-1">
        <CourtScheduler
          slots={loading ? [] : slots}
          onDateChange={handleDateChange}
          onAddSlot={() => setAddingSlot(true)}
          username={username}
          onSlotTap={(slot) => setSelectedSlot(slot)}
        />
      </div>

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
          userId={userId}
          date={currentDate}
          editSlot={editingSlot ?? undefined}
          onClose={() => {
            setAddingSlot(false);
            setEditingSlot(null);
          }}
        />
      )}
    </div>
  );
}
