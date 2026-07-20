import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { localDateStr, defaultStartTime, minToTimeStr, timeStrToMin } from "@/lib/utils/timeline";
import type { TimeSlot } from "@/lib/types";

interface Options {
  courtId: string;
  username: string;
  date: Date;
  onSuccess: () => void;
  editSlot?: TimeSlot;
}

/**
 * Manages the "add/edit slot" form: field state, validation, and the Supabase insert/update.
 * The caller (AddSlotModal) only handles rendering.
 */
export function useAddSlot({ courtId, username, date, onSuccess, editSlot }: Options) {
  const [startTime, setStartTime] = useState(() =>
    editSlot ? minToTimeStr(editSlot.startMin) : defaultStartTime()
  );
  const [duration, setDuration] = useState(() =>
    editSlot ? editSlot.endMin - editSlot.startMin : 60
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const startMin = timeStrToMin(startTime);
    const endMin = startMin + duration;

    if (endMin > 24 * 60) {
      setError("Slot endet nach Mitternacht. Bitte wähle eine kürzere Dauer.");
      return;
    }

    setSaving(true);
    setError(null);

    if (editSlot) {
      const { error: updateError } = await supabase
        .from("slots")
        .update({ start_min: startMin, end_min: endMin })
        .eq("id", editSlot.id);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("slots").insert({
        court_id: courtId,
        user_name: username,
        date: localDateStr(date),
        start_min: startMin,
        end_min: endMin,
      });

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
    }

    onSuccess();
  }

  return { startTime, setStartTime, duration, setDuration, saving, error, submit };
}
