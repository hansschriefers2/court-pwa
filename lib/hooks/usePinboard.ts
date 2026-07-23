import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { PinboardMessage } from "@/lib/types";

// ─── Internal types ───────────────────────────────────────────────────────────

interface MessageRow {
  id: string;
  court_id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
}

function rowToMessage(row: MessageRow): PinboardMessage {
  return {
    id: row.id,
    courtId: row.court_id,
    userId: row.user_id,
    username: row.username,
    message: row.message,
    createdAt: row.created_at,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages pinboard messages for a court:
 * - Fetches all messages on mount
 * - Subscribes to Supabase Realtime for live INSERT / DELETE events
 * - Exposes `addMessage` and `deleteMessage`
 */
export function usePinboard(courtId: string) {
  const [messages, setMessages] = useState<PinboardMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pinboard_messages")
      .select("id, court_id, user_id, username, message, created_at")
      .eq("court_id", courtId)
      .order("created_at", { ascending: false });
    setMessages((data as MessageRow[] ?? []).map(rowToMessage));
    setLoading(false);
  }, [courtId]);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`pinboard:${courtId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pinboard_messages",
          filter: `court_id=eq.${courtId}`,
        },
        (payload) => {
          const newMsg = rowToMessage(payload.new as MessageRow);
          setMessages((prev) => {
            // Avoid duplicate if our own optimistic insert already added it
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [newMsg, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "pinboard_messages",
          filter: `court_id=eq.${courtId}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== (payload.old as { id: string }).id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courtId, fetchMessages]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const addMessage = useCallback(
    async (text: string, username: string, userId: string) => {
      await supabase.from("pinboard_messages").insert({
        court_id: courtId,
        user_id: userId,
        username,
        message: text,
      });
    },
    [courtId]
  );

  const deleteMessage = useCallback(async (id: string) => {
    // Optimistic removal
    setMessages((prev) => prev.filter((m) => m.id !== id));
    await supabase.from("pinboard_messages").delete().eq("id", id);
  }, []);

  return { messages, loading, addMessage, deleteMessage };
}
