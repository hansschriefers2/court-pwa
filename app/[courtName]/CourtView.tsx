"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { useUsername } from "@/lib/hooks/useUsername";
import { useSlots } from "@/lib/hooks/useSlots";
import { useTrainings } from "@/lib/hooks/useTrainings";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
import { useDateUtilization } from "@/lib/hooks/useDateUtilization";
import { addRecentCourt } from "@/lib/hooks/useRecentCourts";
import CourtScheduler from "@/app/components/CourtScheduler";
import UsernameModal from "@/app/components/UsernameModal";
import AddSlotModal from "@/app/components/AddSlotModal";
import SlotActionModal from "@/app/components/SlotActionModal";
import ManageTrainingsModal from "@/app/components/ManageTrainingsModal";
import TrainingResponseModal from "@/app/components/TrainingResponseModal";
import { IOSInstructionsModal, detectPlatform, isStandalone } from "@/app/components/PWAInstallPrompt";
import type { Court, RecurringTraining, TimeSlot } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalState =
  | { mode: "add"; copyFrom?: TimeSlot }
  | { mode: "action"; slot: TimeSlot }
  | { mode: "edit"; slot: TimeSlot }
  | { mode: "training-manage" }
  | { mode: "training-response"; training: RecurringTraining }
  | null;

const subscribeToDisplayMode = () => () => {};
const getServerPlatform = () => null;
const getServerStandalone = () => false;

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
  const { trainings } = useTrainings(court.id);
  const utilizationByDate = useDateUtilization(court.id);
  const [modal, setModal] = useState<ModalState>(null);
  const [showIOSInstallModal, setShowIOSInstallModal] = useState(false);
  const [continueToAddSlot, setContinueToAddSlot] = useState(false);
  const platform = useSyncExternalStore(subscribeToDisplayMode, detectPlatform, getServerPlatform);
  const standalone = useSyncExternalStore(subscribeToDisplayMode, isStandalone, getServerStandalone);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  // trainings for the currently viewed weekday
  const dailyTrainings = trainings.filter((t) => t.dayOfWeek === currentDate.getDay());

  function handleTrainingTap(training: RecurringTraining) {
    const existing = slots.find((s) => s.trainingId === training.id && s.userId === userId);
    if (existing) {
      setModal({ mode: "action", slot: existing });
    } else {
      setModal({ mode: "training-response", training });
    }
  }
  const { isSupported, isInitialized: notifyInitialized, isSubscribed, isLoading: notifyLoading, isDenied, toggle: toggleNotify } =
    usePushNotifications(court.id, userId);

  function handleNotifyClick() {
    if (!isSubscribed && platform === "ios" && !standalone) {
      setContinueToAddSlot(false);
      setShowIOSInstallModal(true);
      return;
    }
    toggleNotify();
  }

  function handleAddSlot() {
    if (
      platform === "ios" &&
      !standalone &&
      !localStorage.getItem("ios-install-slot-gate-seen")
    ) {
      localStorage.setItem("ios-install-slot-gate-seen", "1");
      setContinueToAddSlot(true);
      setShowIOSInstallModal(true);
      return;
    }
    setModal({ mode: "add" });
  }

  function handleShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      (navigator as Navigator & { share: (data: object) => Promise<void> })
        .share({
          title: court.name,
          text: `Komm zu ${court.name} auf Court. Auf dem iPhone: Link in Safari öffnen, Teilen → Zum Home-Bildschirm, dann Court über das neue App-Symbol öffnen, um Benachrichtigungen zu erhalten.`,
          url: window.location.href,
        })
        .catch(() => {/* dismissed */});
    }
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

        {/* Notifications button — always visible in the header */}
        {(isSupported || (platform === "ios" && !standalone)) && (
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

        {/* Three-dot overflow menu — Pinnwand, Teilen, Trainings */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menü"
            aria-expanded={menuOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-2xl border border-gray-100 bg-white py-1.5 shadow-xl">
              {/* Pinnwand */}
              <Link
                href={`/${court.slug}/pinnwand`}
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-gray-400">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                Pinnwand
              </Link>

              {/* Share — only when the Web Share API is available */}
              {typeof navigator !== "undefined" && "share" in navigator && (
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); handleShare(); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-gray-400">
                    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  Teilen
                </button>
              )}

              <div className="my-1.5 border-t border-gray-100" />

              {/* Training management */}
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setModal({ mode: "training-manage" }); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-100">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5 text-violet-600">
                    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </span>
                Trainings verwalten
              </button>

              <div className="my-1.5 border-t border-gray-100" />

              {/* FAQ */}
              <Link
                href="/faq"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-gray-400">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                FAQ & Hilfe
              </Link>
            </div>
          )}
        </div>
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

      {platform === "ios" && !standalone && (
        <button
          type="button"
          onClick={() => {
            setContinueToAddSlot(false);
            setShowIOSInstallModal(true);
          }}
          className="flex shrink-0 items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-left"
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-amber-950">Browser-Version: Benachrichtigungen nicht verfügbar</span>
            <span className="block text-xs text-amber-800">Court installieren, damit du Zusagen und gemeinsame Zeiten nicht verpasst.</span>
          </span>
          <span className="shrink-0 text-xs font-semibold text-amber-950">Anleitung</span>
        </button>
      )}

      {notifyInitialized &&
        !isSubscribed &&
        (isSupported || isDenied) &&
        !(platform === "ios" && !standalone) && (
        <div
          className="flex shrink-0 items-center gap-3 border-b border-lime-200 bg-lime-50 px-4 py-2.5"
          role="status"
        >
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${isDenied ? "bg-red-500" : "bg-lime-500"}`}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-gray-900">
              {isDenied ? "Benachrichtigungen sind blockiert" : "Benachrichtigungen sind ausgeschaltet"}
            </span>
            <span className="block text-xs text-gray-600">
              {isDenied ? (
                standalone && platform === "ios"
                  ? "Bitte in den iPhone-Einstellungen für Court erlauben."
                  : "Bitte in den Browser-Einstellungen für Court erlauben."
              ) : (
                "Tippe oben auf die Glocke, um sie wieder zu aktivieren."
              )}
            </span>
          </span>
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
          onAddSlot={handleAddSlot}
          userId={userId}
          onSlotTap={(slot) => setModal({ mode: "action", slot })}
          onForeignSlotTap={(slot) => setModal({ mode: "add", copyFrom: slot })}
          minPeople={court.min_people}
          utilizationByDate={utilizationByDate}
          trainings={dailyTrainings}
          onTrainingTap={handleTrainingTap}
          loading={loading}
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
          copyFrom={modal.mode === "add" ? modal.copyFrom : undefined}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === "training-manage" && (
        <ManageTrainingsModal
          trainings={trainings}
          courtId={court.id}
          userId={userId}
          username={username}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === "training-response" && (
        <TrainingResponseModal
          training={modal.training}
          date={currentDate}
          userId={userId}
          username={username}
          onClose={() => setModal(null)}
        />
      )}
      {showIOSInstallModal && (
        <IOSInstructionsModal
          onDismiss={() => {
            setShowIOSInstallModal(false);
            setContinueToAddSlot(false);
          }}
          onContinue={continueToAddSlot ? () => {
            setShowIOSInstallModal(false);
            setContinueToAddSlot(false);
            setModal({ mode: "add" });
          } : undefined}
        />
      )}
    </div>
  );
}
