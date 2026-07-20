"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function HomeClient() {
  const [createName, setCreateName] = useState("");
  const [joinSlug, setJoinSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function create() {
    const trimmed = createName.trim();
    if (!trimmed) return;

    const slug = toSlug(trimmed);
    if (!slug) {
      setError("Bitte nur Buchstaben und Zahlen verwenden.");
      return;
    }

    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from("courts").insert({
      name: trimmed,
      slug,
      min_people: 2,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    router.push(`/${slug}`);
  }

  function join() {
    const slug = joinSlug.trim();
    if (!slug) return;
    router.push(`/${slug}`);
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm space-y-4">

        {/* Logo */}
        <img
          src="/icon_1024.png"
          alt="Court Slots"
          width={72}
          height={72}
          className="mx-auto rounded-2xl shadow-md"
        />

        {/* Create */}
        <div className="rounded-2xl bg-white p-6 shadow-xl">
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
            onChange={(e) => { setCreateName(e.target.value); setError(null); }}
            onKeyDown={(e) => e.key === "Enter" && create()}
            className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-lime-400"
          />
          {error && (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            onClick={create}
            disabled={!createName.trim() || saving}
            className="w-full rounded-lg bg-lime-400 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-lime-300 disabled:opacity-40"
          >
            {saving ? "Erstellen…" : "Platz erstellen"}
          </button>
        </div>

        {/* Join */}
        <div className="rounded-2xl bg-white p-6 shadow-xl">
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
            className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-lime-400"
          />
          <button
            onClick={join}
            disabled={!joinSlug.trim()}
            className="w-full rounded-lg border border-lime-400 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-lime-50 disabled:opacity-40"
          >
            Öffnen
          </button>
        </div>

      </div>
    </div>
  );
}
