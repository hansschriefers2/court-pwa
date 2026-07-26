import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { localDateStr } from "@/lib/utils/timeline";

/**
 * Fetches distinct-user counts per date for the next 60 days.
 * Returns a Map<YYYY-MM-DD, distinctUserCount>.
 */
export function useDateUtilization(courtId: string): Map<string, number> {
  const [utilization, setUtilization] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!courtId) return;

    const today = new Date();
    const future = new Date();
    future.setDate(future.getDate() + 60);

    supabase
      .from("slots")
      .select("date, user_id")
      .eq("court_id", courtId)
      .gte("date", localDateStr(today))
      .lte("date", localDateStr(future))
      .then(({ data }) => {
        if (!data) return;
        const byDate = new Map<string, Set<string>>();
        for (const row of data as { date: string; user_id: string }[]) {
          if (!byDate.has(row.date)) byDate.set(row.date, new Set());
          byDate.get(row.date)!.add(row.user_id);
        }
        const counts = new Map<string, number>();
        for (const [date, users] of byDate) counts.set(date, users.size);
        setUtilization(counts);
      });
  }, [courtId]);

  return utilization;
}
