"use client";

import { useSyncExternalStore } from "react";
import { detectPlatform, isStandalone } from "@/app/components/PWAInstallPrompt";

const subscribeToDisplayMode = () => () => {};
const getServerPlatform = () => "desktop" as const;
const getServerStandalone = () => false;

export default function InstallInstructions() {
  const detectedPlatform = useSyncExternalStore(subscribeToDisplayMode, detectPlatform, getServerPlatform);
  const installed = useSyncExternalStore(subscribeToDisplayMode, isStandalone, getServerStandalone);
  const platform = detectedPlatform ?? "desktop";

  if (installed) {
    return <p>Court läuft bereits als installierte App – super!</p>;
  }

  if (platform === "ios") {
    return (
      <ol className="list-decimal list-inside space-y-1">
        <li>Öffne Court in <strong>Safari</strong>.</li>
        <li>Tippe auf das <strong>Teilen-Symbol</strong> (□↑) in der unteren Leiste.</li>
        <li>Wähle <strong>„Zum Home-Bildschirm“</strong>.</li>
        <li>Tippe auf <strong>„Hinzufügen“</strong>.</li>
        <li>Öffne Court über das neue App-Symbol und aktiviere dort Benachrichtigungen.</li>
      </ol>
    );
  }

  if (platform === "android") {
    return (
      <ol className="list-decimal list-inside space-y-1">
        <li>Öffne Court in <strong>Chrome</strong>.</li>
        <li>Tippe auf die <strong>drei Punkte</strong> oben rechts.</li>
        <li>Wähle <strong>„App installieren“</strong> oder <strong>„Zum Startbildschirm hinzufügen“</strong>.</li>
        <li>Bestätige mit <strong>„Hinzufügen“</strong> – fertig.</li>
      </ol>
    );
  }

  // Desktop (Chrome / Edge)
  return (
    <ol className="list-decimal list-inside space-y-1">
      <li>Öffne Court in <strong>Chrome</strong> oder <strong>Edge</strong>.</li>
      <li>Klicke auf das <strong>Installations-Symbol</strong> (⊕) rechts in der Adressleiste.</li>
      <li>Bestätige mit <strong>„Installieren“</strong> – fertig.</li>
    </ol>
  );
}
