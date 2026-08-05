import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { RecurringTraining } from "@/lib/types";


// ─── Internal types ───────────────────────────────────────────────────────────

interface TrainingRow {
  id: string;
  court_id: string;
  created_by_user_id: string;
  created_by_username: string;
  label: string;
  day_of_week: number;
  start_min: number;
  end_min: number;
}

function rowToTraining(row: TrainingRow): RecurringTraining {
  return {
    id: row.id,
    courtId: row.court_id,
    createdByUserId: row.created_by_user_id,
    createdByUsername: row.created_by_username,
    label: row.label,
    dayOfWeek: row.day_of_week,
    startMin: row.start_min,
    endMin: row.end_min,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTrainings(courtId: string) {
  const [trainings, setTrainings] = useState<RecurringTraining[]>([]);

  const fetchTrainings = useCallback(async () => {
    const { data } = await supabase
      .from("trainings")
      .select(
        "id, court_id, created_by_user_id, created_by_username, label, day_of_week, start_min, end_min"
      )
      .eq("court_id", courtId)
      .order("day_of_week")
      .order("start_min");
    if (data) setTrainings((data as TrainingRow[]).map(rowToTraining));
  }, [courtId]);

  useEffect(() => {
    fetchTrainings();
  }, [fetchTrainings]);

  useEffect(() => {
    const channel = supabase
      .channel(`court-trainings-${courtId}`)
      .on(
        "postgres_changes",
        // No server-side filter: DELETE events only carry the PK in payload.old,
        // so a court_id filter would silently drop them. Filter INSERT/UPDATE client-side instead.
        { event: "*", schema: "public", table: "trainings" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as TrainingRow;
            if (row.court_id !== courtId) return;
            setTrainings((prev) => [...prev, rowToTraining(row)]);
          } else if (payload.eventType === "DELETE") {
            setTrainings((prev) => prev.filter((t) => t.id !== (payload.old as { id: string }).id));
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as TrainingRow;
            if (row.court_id !== courtId) return;
            setTrainings((prev) =>
              prev.map((t) => (t.id === row.id ? rowToTraining(row) : t))
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [courtId]);

  return { trainings, refetch: fetchTrainings };
}
