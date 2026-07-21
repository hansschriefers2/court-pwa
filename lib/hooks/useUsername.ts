import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const COOKIE_NAME = "court_username";
const USER_ID_COOKIE = "court_user_id";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${encodeURIComponent(name)}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days = 365): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value
  )}; expires=${expires}; path=/; SameSite=Lax`;
}

export function useUsername() {
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [inputName, setInputName] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = getCookie(COOKIE_NAME);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time initialisation from browser cookie; can't use lazy useState on SSR
    if (saved) setUsername(saved);

    // Stable per-device ID — generated once, never tied to the display name.
    let id = getCookie(USER_ID_COOKIE);
    if (!id) {
      id = crypto.randomUUID();
      setCookie(USER_ID_COOKIE, id);
    }
    setUserId(id);

    // Sync existing users to the DB (covers users from before the table existed).
    if (saved) {
      supabase
        .from("users")
        .upsert({ id, username: saved }, { onConflict: "id" })
        .then(({ error }) => { if (error) console.error("users upsert error:", error); });
    }

    setReady(true);
  }, []);

  function confirm() {
    const trimmed = inputName.trim();
    if (!trimmed) return;
    setCookie(COOKIE_NAME, trimmed);
    setUsername(trimmed);
    // Read directly from cookie to avoid any stale-closure issue with userId state.
    const id = getCookie(USER_ID_COOKIE);
    if (!id) return;
    supabase
      .from("users")
      .upsert({ id, username: trimmed }, { onConflict: "id" })
      .then(({ error }) => { if (error) console.error("users upsert error:", error); });
  }

  return { username, userId, inputName, setInputName, confirm, ready };
}
