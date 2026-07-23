"use client";

import { useCallback, useEffect, useState } from "react";

export interface RecentCourt {
  slug: string;
  name: string;
}

const COOKIE_NAME = "recent_courts";
const MAX_ENTRIES = 5;
// 1 year in seconds
const MAX_AGE = 60 * 60 * 24 * 365;

function readCookie(): RecentCourt[] {
  if (typeof document === "undefined") return [];
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  if (!match) return [];
  try {
    return JSON.parse(decodeURIComponent(match.split("=").slice(1).join("=")));
  } catch {
    return [];
  }
}

function writeCookie(courts: RecentCourt[]) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
    JSON.stringify(courts)
  )}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function addRecentCourt(slug: string, name: string) {
  const current = readCookie().filter((c) => c.slug !== slug);
  const updated = [{ slug, name }, ...current].slice(0, MAX_ENTRIES);
  writeCookie(updated);
}

export function useRecentCourts() {
  const [courts, setCourts] = useState<RecentCourt[]>([]);

  useEffect(() => {
    setCourts(readCookie());
  }, []);

  const remove = useCallback((slug: string) => {
    const updated = readCookie().filter((c) => c.slug !== slug);
    writeCookie(updated);
    setCourts(updated);
  }, []);

  return { courts, remove };
}
