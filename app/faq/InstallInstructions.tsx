"use client";

import { useEffect, useState } from "react";
import { detectPlatform, isStandalone } from "@/app/components/PWAInstallPrompt";

export default function InstallInstructions() {
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    const p = detectPlatform();
    setPlatform(p ?? "desktop");
  }, []);

  if (installed) {
    return <p>Court läuft bereits als installierte App – super!</p>;
  }

  if (platform === "ios") {
    return (
      <ol className="list-decimal list-inside space-y-1">
        <li>Öffne Court in <strong>Safari</strong>.</li>
        <li>Tippe auf das <strong>Teilen-Symbol</strong> (□↑) in der unteren Leiste.</li>
        <li>Wähle <strong>„Zum Home-Bildschirm"</strong>.</li>
        <li>Tippe auf <strong>„Hinzufügen"</strong> – fertig.</li>
      </ol>
    );
  }

  if (platform === "android") {
    return (
      <ol className="list-decimal list-inside space-y-1">
        <li>Öffne Court in <strong>Chrome</strong>.</li>
        <li>Tippe auf die <strong>drei Punkte</strong> oben rechts.</li>
        <li>Wähle <strong>„App installieren"</strong> oder <strong>„Zum Startbildschirm hinzufügen"</strong>.</li>
        <li>Bestätige mit <strong>„Hinzufügen"</strong> – fertig.</li>
      </ol>
    );
  }

  // Desktop (Chrome / Edge)
  return (
    <ol className="list-decimal list-inside space-y-1">
      <li>Öffne Court in <strong>Chrome</strong> oder <strong>Edge</strong>.</li>
      <li>Klicke auf das <strong>Installations-Symbol</strong> (⊕) rechts in der Adressleiste.</li>
      <li>Bestätige mit <strong>„Installieren"</strong> – fertig.</li>
    </ol>
  );
}
