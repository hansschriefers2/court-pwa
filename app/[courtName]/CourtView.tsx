"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUsername } from "@/lib/hooks/useUsername";
import { useSlots } from "@/lib/hooks/useSlots";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
import { addRecentCourt } from "@/lib/hooks/useRecentCourts";
import CourtScheduler from "@/app/components/CourtScheduler";
import UsernameModal from "@/app/components/UsernameModal";
import AddSlotModal from "@/app/components/AddSlotModal";
import SlotActionModal from "@/app/components/SlotActionModal";
import { IOSInstructionsModal, detectPlatform, isStandalone } from "@/app/components/PWAInstallPrompt";
import type { Court, TimeSlot } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalState =
  | { mode: "add" }
  | { mode: "action"; slot: TimeSlot }
  | { mode: "edit"; slot: TimeSlot }
  | null;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  court: Court;
}

export default function CourtView({ court }: Props) {
  useEffect(() => {
    addRecentCourt(court.slug, court.name);
  }, [court.slug, court.name]);

  const { username, userId, inputName, setInputName, confirm, ready } = useUsername();
  const { slots, loading, error, currentDate, handleDateChange, deleteSlot } = useSlots(
    court.id,
    username
  );
  const [modal, setModal] = useState<ModalState>(null);
  const [showIOSInstallModal, setShowIOSInstallModal] = useState(false);
  // Hook must be called before any early return (rules of hooks).
  // Pass !!username so the auto-subscribe prompt only fires once the user has a name.
  const { isSupported, isSubscribed, isLoading: notifyLoading, isDenied, toggle: toggleNotify } =
    usePushNotifications(court.id, userId, !!username);

  function handleNotifyClick() {
    if (!isSubscribed && detectPlatform() === "ios" && !isStandalone()) {
      setShowIOSInstallModal(true);
      return;
    }
    toggleNotify();
  }

  function handleShare() {
    navigator.share({
      title: court.name,
      url: window.location.href,
    }).catch(() => {/* dismissed or unsupported */});
  }

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

        {/* Pinboard button */}
        <Link
          href={`/${court.slug}/pinnwand`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700 active:scale-95"
          aria-label="Pinnwand"
          title="Pinnwand – Nachrichten für den Court"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </Link>

        {isStandalone() && typeof navigator !== "undefined" && "share" in navigator && (
          <button
            onClick={handleShare}
            aria-label="Court teilen"
            title="Court teilen"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
        )}

        {isSupported && (
          <button
            onClick={isDenied ? undefined : handleNotifyClick}
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

      {/* ── Info strip ─────────────────────────────────────────────────── */}
      {(court.description || court.maps_url) && (
        <div className="flex shrink-0 items-center gap-2 bg-gray-50 border-b border-gray-100 px-4 py-2">
          {court.description && (
            <p className="flex-1 text-xs text-gray-400 leading-relaxed">{court.description}</p>
          )}
          {court.maps_url && (
            <a
              href={court.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1 rounded-full bg-white border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
              aria-label="In Google Maps öffnen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-red-500" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Maps
            </a>
          )}
        </div>
      )}

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
          onAddSlot={() => setModal({ mode: "add" })}
          userId={userId}
          onSlotTap={(slot) => setModal({ mode: "action", slot })}
        />
      </div>

      {modal?.mode === "action" && (
        <SlotActionModal
          slot={modal.slot}
          onEdit={() => setModal({ mode: "edit", slot: modal.slot })}
          onDelete={async () => {
            await deleteSlot(modal.slot.id);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {(modal?.mode === "add" || modal?.mode === "edit") && (
        <AddSlotModal
          court={court}
          username={username}
          userId={userId}
          date={currentDate}
          editSlot={modal.mode === "edit" ? modal.slot : undefined}
          onClose={() => setModal(null)}
        />
      )}
      {showIOSInstallModal && (
        <IOSInstructionsModal onDismiss={() => setShowIOSInstallModal(false)} />
      )}
    </div>
  );
}
