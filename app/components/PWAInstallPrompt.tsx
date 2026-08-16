"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { trackInstallEvent } from "@/lib/installTracking";

// ─── Types ────────────────────────────────────────────────────────────────────

// BeforeInstallPromptEvent is not part of the standard TS lib yet.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DISMISSED_KEY = "pwa-install-dismissed-this-session";

export function detectPlatform(): "ios" | "android" | null {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return null;
}

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

interface BannerProps {
  platform: "ios" | "android";
  onAction: () => void;
  onDismiss: () => void;
}

function InstallBanner({ platform, onAction, onDismiss }: BannerProps) {
  return (
    <div
      role="banner"
      className="fixed bottom-0 inset-x-0 z-50 flex items-center gap-3 border-t border-gray-200 bg-white px-4 py-3 shadow-lg"
    >
      <Image
        src="/icon_1024.png"
        alt=""
        width={40}
        height={40}
        className="shrink-0 rounded-xl"
      />

      <p className="flex-1 text-sm font-medium leading-snug text-gray-800">
        {platform === "ios"
          ? "Keine Zusage verpassen: Court als App installieren"
          : "Court installieren und schneller zum Platz kommen"}
      </p>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={onAction}
          className="rounded-lg bg-lime-400 px-3 py-1.5 text-sm font-medium text-gray-900 transition-colors hover:bg-lime-300 active:scale-95"
        >
          {platform === "ios" ? "So geht’s" : "Installieren"}
        </button>
        <button
          onClick={onDismiss}
          aria-label="Banner schließen"
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

export function IOSInstructionsModal({
  onDismiss,
  onContinue,
}: {
  onDismiss: () => void;
  onContinue?: () => void;
}) {
  useEffect(() => {
    trackInstallEvent("install_help_viewed");
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <div
        className="w-full max-w-sm rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ios-install-title"
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2
              id="ios-install-title"
              className="text-base font-semibold text-gray-800"
            >
              Court installieren
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Erhalte neue Zusagen, Absagen und gemeinsame Zeiten.
            </p>
          </div>
          <button
            onClick={onDismiss}
            aria-label="Schließen"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mb-5 rounded-lg border border-lime-200 bg-lime-50 px-3 py-2.5 text-sm text-lime-950">
          Auf dem iPhone funktionieren Benachrichtigungen nur in der installierten App.
        </div>

        {/* Steps */}
        <ol className="space-y-4">
          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lime-400 text-xs font-bold text-gray-900">
              1
            </span>
            <p className="pt-0.5 text-sm text-gray-700">
              Tippe auf das{" "}
              <strong className="font-semibold text-gray-900">
                Teilen-Symbol
              </strong>{" "}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="inline h-4 w-4 align-middle"
                aria-hidden="true"
              >
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>{" "}
              in der unteren Safari-Leiste.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lime-400 text-xs font-bold text-gray-900">
              2
            </span>
            <p className="pt-0.5 text-sm text-gray-700">
              Wähle{" "}
              <strong className="font-semibold text-gray-900">
                {"\u201EZum Home-Bildschirm\u201C"}
              </strong>
              .
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lime-400 text-xs font-bold text-gray-900">
              3
            </span>
            <p className="pt-0.5 text-sm text-gray-700">
              Tippe oben rechts auf{" "}
              <strong className="font-semibold text-gray-900">
                {"\u201EHinzufügen\u201C"}
              </strong>
              .
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lime-400 text-xs font-bold text-gray-900">
              4
            </span>
            <p className="pt-0.5 text-sm text-gray-700">
              Öffne Court danach über das{" "}
              <strong className="font-semibold text-gray-900">
                neue App-Symbol
              </strong>
              . Dort kannst du Benachrichtigungen aktivieren.
            </p>
          </li>
        </ol>

        <div className="mt-6 space-y-2">
          <button
            onClick={onDismiss}
            className="w-full rounded-lg bg-lime-400 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-lime-300"
          >
            Verstanden
          </button>
          {onContinue && (
            <button
              onClick={onContinue}
              className="w-full py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
            >
              Ohne Benachrichtigungen fortfahren
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Shows a contextual install prompt:
 * - Android: listens for `beforeinstallprompt` and shows a bottom banner
 *            that triggers the native install flow on tap.
 * - iOS:     shows a banner with a step-by-step modal explaining how to
 *            add the app to the Home Screen (required for Push on iOS).
 *
 * Hidden when already running in standalone (installed) mode.
 * Remembers dismissal for the current browser session.
 */
export default function PWAInstallPrompt() {
  const pathname = usePathname();
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      if (!sessionStorage.getItem("standalone-opened-tracked")) {
        trackInstallEvent("standalone_opened");
        sessionStorage.setItem("standalone-opened-tracked", "1");
      }
      return;
    }
    if (pathname !== "/" || sessionStorage.getItem(DISMISSED_KEY)) return;

    const detected = detectPlatform();
    if (!detected) return;

    if (detected === "ios") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time platform detection on mount
      setPlatform("ios");
      setShowBanner(true);
      return;
    }

    // Android: wait for the browser's install gate
    setPlatform("android");
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
  }, [pathname]);

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setShowBanner(false);
    setShowModal(false);
  }

  async function handleAndroidInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") setShowBanner(false);
  }

  if (!showBanner) return null;

  return (
    <>
      {!showModal && (
        <InstallBanner
          platform={platform!}
          onAction={
            platform === "android"
              ? handleAndroidInstall
              : () => setShowModal(true)
          }
          onDismiss={dismiss}
        />
      )}
      {showModal && platform === "ios" && (
        <IOSInstructionsModal onDismiss={dismiss} />
      )}
    </>
  );
}
