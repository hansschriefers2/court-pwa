"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePinboard } from "@/lib/hooks/usePinboard";
import { useUsername } from "@/lib/hooks/useUsername";
import UsernameModal from "@/app/components/UsernameModal";
import type { Court, PinboardMessage } from "@/lib/types";

const NOTE_STYLE = { bg: "#fef9c3", border: "#fde047" }; // yellow-100 / yellow-300

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NoteCard({
  msg,
  onDelete,
}: {
  msg: PinboardMessage;
  onDelete: (id: string) => void;
}) {
  const { bg, border } = NOTE_STYLE;

  return (
    <div
      className="relative mb-3 break-inside-avoid rounded-sm p-3 pb-2 shadow-[2px_4px_12px_rgba(0,0,0,0.18)]"
      style={{
        display: "inline-block",
        width: "100%",
        backgroundColor: bg,
        borderBottom: `3px solid ${border}`,
      }}
    >
      {/* Delete */}
      <button
        onClick={() => onDelete(msg.id)}
        className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition-all hover:bg-black/10 hover:text-gray-700 active:scale-90"
        aria-label="Nachricht entfernen"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Message text */}
      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-snug text-gray-800">
        {msg.message}
      </p>

      {/* Meta */}
      <div className="mt-2 flex items-center gap-1.5">
        <span className="truncate text-xs font-semibold text-gray-600">{msg.username}</span>
        <span className="text-gray-300" aria-hidden="true">·</span>
        <span className="shrink-0 text-xs text-gray-400">{formatDate(msg.createdAt)}</span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  court: Court;
}

export default function PinboardView({ court }: Props) {
  const { username, userId, inputName, setInputName, confirm, ready } = useUsername();
  const { messages, loading, addMessage, deleteMessage } = usePinboard(court.id);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    await addMessage(trimmed, username!, userId);
    setText("");
    setSubmitting(false);
    textareaRef.current?.blur();
  }

  return (
    <div className="flex h-dvh flex-col">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center gap-1 bg-white px-2 shadow-sm">
        <Link
          href={`/${court.slug}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 active:bg-gray-200"
          aria-label="Zurück zum Court"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>

        <h1 className="flex-1 truncate px-1 text-base font-semibold text-gray-900">
          Pinnwand · {court.name}
        </h1>
      </header>

      {/* ── Board ────────────────────────────────────────────────────────── */}
      <div
        className="min-h-0 flex-1 overflow-y-auto"
        style={{ background: "#f0fdf4" }}
      >
        {/* ── Notes masonry ─────────────────────────────────────────────── */}
        {loading ? (
          <p className="py-8 text-center text-sm text-lime-900/50">Laden…</p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-lime-900/60">
            Noch keine Nachrichten. Sei der Erste!
          </p>
        ) : (
          <div
            className="px-3 pt-4 pb-4"
            style={{ columns: "2 150px", columnGap: "12px" }}
          >
            {messages.map((msg) => (
              <NoteCard key={msg.id} msg={msg} onDelete={deleteMessage} />
            ))}
          </div>
        )}
      </div>

      {/* ── Compose bar ──────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-gray-100 bg-white px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 200))}
            placeholder="Nachricht hinterlassen…"
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20 max-h-28 overflow-y-auto"
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
          />
          <button
            type="submit"
            disabled={!text.trim() || submitting}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lime-400 text-gray-900 shadow transition-all hover:bg-lime-300 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Anheften"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22l-4-9-9-4 19-7z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
