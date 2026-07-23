"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCreateCourt } from "@/lib/hooks/useCreateCourt";
import { useRecentCourts } from "@/lib/hooks/useRecentCourts";

export default function HomeClient() {
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createMaps, setCreateMaps] = useState("");
  const [joinSlug, setJoinSlug] = useState("");
  const { create, saving, error, clearError } = useCreateCourt();
  const { courts: recentCourts, remove: removeRecentCourt } = useRecentCourts();
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

        {/* Recent courts */}
        {recentCourts.length > 0 && (
          <div className="w-full">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              Zuletzt besucht
            </p>
            <ul className="flex flex-col gap-1.5">
              {recentCourts.map((c) => (
                <li key={c.slug} className="flex items-center gap-1">
                  <Link
                    href={`/${c.slug}`}
                    className="flex flex-1 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow transition-colors hover:bg-lime-50 active:bg-lime-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-lime-500">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span className="truncate">{c.name}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-auto h-3.5 w-3.5 shrink-0 text-gray-300">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </Link>
                  <button
                    onClick={() => removeRecentCourt(c.slug)}
                    aria-label={`${c.name} entfernen`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 active:bg-red-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cards */}
        <div className="flex w-full flex-col gap-4">

        {/* Join */}
        <div className="flex flex-col rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="mb-1 text-base font-semibold text-gray-800">
            Bestehenden Platz öffnen
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Gib den Kurznamen des Platzes ein.
          </p>
          <input
            autoFocus
            type="text"
            placeholder="z. B. stadtpark-platz-1"
            value={joinSlug}
            onChange={(e) => setJoinSlug(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && join()}
            className="mb-3 w-full rounded-lg border border-gray-400 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20"
          />
          <button
            onClick={join}
            disabled={!joinSlug.trim()}
            className="w-full rounded-lg bg-lime-400 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-lime-300 disabled:opacity-40"
          >
            Öffnen
          </button>
        </div>

        {/* Create */}
        <div className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="mb-1 text-base font-semibold text-gray-800">
            Neuen Platz anlegen
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Gib deinem Platz einen Namen.
          </p>
          <input
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
