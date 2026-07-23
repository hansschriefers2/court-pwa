import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { localDateStr, defaultStartTime, minToTimeStr, timeStrToMin } from "@/lib/utils/timeline";
import type { TimeSlot } from "@/lib/types";

interface Options {
  courtId: string;
  username: string;
  userId: string;
  date: Date;
  onSuccess: () => void;
  editSlot?: TimeSlot;
}

function pushEndTime(timeStr: string, minutes: number): string {
  return minToTimeStr(Math.min(timeStrToMin(timeStr) + minutes, 23 * 60 + 59));
}

/**
 * Manages the "add/edit slot" form: field state, validation, and the Supabase insert/update.
 * The caller (AddSlotModal) only handles rendering.
 */
export function useAddSlot({ courtId, username, userId, date, onSuccess, editSlot }: Options) {
  const [startTime, setStartTimeRaw] = useState(() =>
    editSlot ? minToTimeStr(editSlot.startMin) : defaultStartTime()
  );
  const [endTime, setEndTime] = useState(() =>
    editSlot ? minToTimeStr(editSlot.endMin) : pushEndTime(defaultStartTime(), 60)
  );
  const [displayName, setDisplayName] = useState(editSlot ? editSlot.name : username);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setStartTime(value: string) {
    setStartTimeRaw(value);
    if (timeStrToMin(endTime) <= timeStrToMin(value)) {
      setEndTime(pushEndTime(value, 60));
    }
  }

  async function submit() {
    const startMin = timeStrToMin(startTime);
    const endMin = timeStrToMin(endTime);

    if (endMin <= startMin) {
      setError("Das Ende muss nach dem Start liegen.");
      return;
    }
    if (endMin > 24 * 60) {
      setError("Slot endet nach Mitternacht. Bitte wähle ein früheres Ende.");
      return;
    }

    setSaving(true);
    setError(null);

    if (editSlot) {
      const { error: updateError } = await supabase
        .from("slots")
        .update({ start_min: startMin, end_min: endMin, user_name: displayName.trim() || editSlot.name })
        .eq("id", editSlot.id);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("slots").insert({
        court_id: courtId,
        user_name: displayName.trim() || username,
        user_id: userId,
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

    setSaving(false);
    onSuccess();
  }

  return { startTime, setStartTime, endTime, setEndTime, displayName, setDisplayName, saving, error, submit };
}
