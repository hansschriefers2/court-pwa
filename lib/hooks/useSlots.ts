import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { localDateStr } from "@/lib/utils/timeline";
import type { TimeSlot } from "@/lib/types";

// ─── Internal types ───────────────────────────────────────────────────────────

interface SlotRow {
  id: string;
  user_name: string;
  start_min: number;
  end_min: number;
  date: string; // YYYY-MM-DD
}

function rowToSlot(row: SlotRow): TimeSlot {
  return {
    id: row.id,
    name: row.user_name,
    startMin: row.start_min,
    endMin: row.end_min,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages slot data for a court:
 * - Fetches slots for the currently viewed date
 * - Subscribes to Supabase Realtime for live INSERT / UPDATE / DELETE events
 * - Exposes `handleDateChange` so callers can switch dates
 */
export function useSlots(courtId: string, username: string | null) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // Ref so the realtime handler always sees the latest date without
  // re-subscribing every time the user switches dates.
  const currentDateRef = useRef<Date>(currentDate);
  useEffect(() => {
    currentDateRef.current = currentDate;
  }, [currentDate]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchSlots = useCallback(
    async (date: Date) => {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("slots")
        .select("id, user_name, start_min, end_min, date")
        .eq("court_id", courtId)
        .eq("date", localDateStr(date))
        .order("start_min");

      if (err) {
        setError(err.message);
      } else {
        setSlots((data as SlotRow[]).map(rowToSlot));
      }

      setLoading(false);
    },
    [courtId]
  );

  // ── Date change ────────────────────────────────────────────────────────────
  const handleDateChange = useCallback(
    (date: Date) => {
      setCurrentDate(date);
      fetchSlots(date);
    },
    [fetchSlots]
  );

  // ── Initial fetch once the user is identified ──────────────────────────────
  useEffect(() => {
    if (username) fetchSlots(new Date());
  }, [username, fetchSlots]);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!username) return;

    const channel = supabase
      .channel(`court-slots-${courtId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "slots",
          filter: `court_id=eq.${courtId}`,
        },
        (payload) => {
          const viewingDate = localDateStr(currentDateRef.current);

          if (payload.eventType === "INSERT") {
            const row = payload.new as SlotRow;
            if (row.date === viewingDate) {
              setSlots((prev) => [...prev, rowToSlot(row)]);
            }
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as SlotRow;
            if (row.date === viewingDate) {
              setSlots((prev) =>
                prev.map((s) => (s.id === row.id ? rowToSlot(row) : s))
              );
            } else {
              // Row's date changed — remove it from the current view
              setSlots((prev) => prev.filter((s) => s.id !== row.id));
            }
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as { id: string };
            setSlots((prev) => prev.filter((s) => s.id !== old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // courtId and username are stable; handler reads date via ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courtId, username]);

  function removeSlot(id: string) {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  }

  return { slots, loading, error, currentDate, handleDateChange, removeSlot };
}
