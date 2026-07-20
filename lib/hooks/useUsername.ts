import { useEffect, useState } from "react";

const COOKIE_NAME = "court_username";

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
  const [inputName, setInputName] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = getCookie(COOKIE_NAME);
    if (saved) setUsername(saved);
    setReady(true);
  }, []);

  function confirm() {
    const trimmed = inputName.trim();
    if (!trimmed) return;
    setCookie(COOKIE_NAME, trimmed);
    setUsername(trimmed);
  }

  return { username, inputName, setInputName, confirm, ready };
}
