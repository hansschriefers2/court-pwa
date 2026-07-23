"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCreateCourt } from "@/lib/hooks/useCreateCourt";

export default function HomeClient() {
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createMaps, setCreateMaps] = useState("");
  const [joinSlug, setJoinSlug] = useState("");
  const { create, saving, error, clearError } = useCreateCourt();
  const router = useRouter();

  function join() {
    const slug = joinSlug.trim().toLowerCase();
    if (!slug) return;
    router.push(`/${slug}`);
  }

  return (
    <div className="flex h-dvh flex-col items-center bg-gray-100 px-4">
      <div className="flex flex-1 w-full max-w-sm flex-col items-center justify-center gap-4 py-8">

        {/* Logo */}
        <img
          src="/icon_1024.png"
          alt="Court"
          width={72}
          height={72}
          className="mx-auto rounded-2xl shadow-md"
        />

        {/* Cards — grid forces both rows to the height of the taller one */}
        <div className="grid w-full grid-rows-[1fr_1fr] gap-4">

        {/* Create */}
        <div className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="mb-1 text-base font-semibold text-gray-800">
            Neuen Platz anlegen
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Gib deinem Platz einen Namen.
          </p>
          <input
            autoFocus
            type="text"
            placeholder="z. B. Stadtpark Platz 1"
            value={createName}
            onChange={(e) => { setCreateName(e.target.value); clearError(); }}
            onKeyDown={(e) => e.key === "Enter" && create(createName, createDesc, createMaps)}
            className="mb-3 w-full rounded-lg border border-gray-400 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20"
          />
          <textarea
            placeholder="Kurzbeschreibung (optional, max. 400 Zeichen)"
            value={createDesc}
            maxLength={400}
            rows={2}
            onChange={(e) => setCreateDesc(e.target.value)}
            className="mb-3 w-full resize-none rounded-lg border border-gray-400 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20"
          />
          <input
            type="url"
            placeholder="Google Maps Link (optional)"
            value={createMaps}
            onChange={(e) => setCreateMaps(e.target.value)}
            className="mb-3 w-full rounded-lg border border-gray-400 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20"
          />
          {error && (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex-1" />
          <button
            onClick={() => create(createName, createDesc, createMaps)}
            disabled={!createName.trim() || saving}
            className="w-full rounded-lg bg-lime-400 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-lime-300 disabled:opacity-40"
          >
            {saving ? "Erstellen…" : "Platz erstellen"}
          </button>
        </div>

        {/* Join */}
        <div className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="mb-1 text-base font-semibold text-gray-800">
            Bestehenden Platz öffnen
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Gib den Kurznamen des Platzes ein.
          </p>
          <input
            type="text"
            placeholder="z. B. stadtpark-platz-1"
            value={joinSlug}
            onChange={(e) => setJoinSlug(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && join()}
            className="mb-3 w-full rounded-lg border border-gray-400 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20"
          />
          <div className="flex-1" />
          <button
            onClick={join}
            disabled={!joinSlug.trim()}
            className="w-full rounded-lg bg-lime-400 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-lime-300 disabled:opacity-40"
          >
            Öffnen
          </button>
        </div>

        </div>

      </div>

      {/* Footer */}
      <footer className="mb-6 flex justify-center gap-5 text-xs text-gray-400">
        <Link href="/impressum" className="hover:text-gray-600 transition-colors">Impressum</Link>
        <Link href="/datenschutz" className="hover:text-gray-600 transition-colors">Datenschutz</Link>
        <Link href="/faq" className="hover:text-gray-600 transition-colors">FAQ</Link>
      </footer>

    </div>
  );
}
