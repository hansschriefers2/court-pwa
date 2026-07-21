import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert the base64url VAPID public key to the Uint8Array the browser needs. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UsePushNotificationsResult {
  /** Whether the browser supports push and the service worker is ready. */
  isSupported: boolean;
  /** Whether this browser is currently subscribed to push for this court. */
  isSubscribed: boolean;
  /** True while a subscribe/unsubscribe operation is in flight. */
  isLoading: boolean;
  /**
   * If the browser has explicitly denied notifications, we can only ask the
   * user to re-enable them in their browser settings.
   */
  isDenied: boolean;
  /** Toggle subscription on/off for the given court. */
  toggle: () => void;
}

export function usePushNotifications(courtId: string): UsePushNotificationsResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDenied, setIsDenied] = useState(false);

  // ── Bootstrap: register SW and check current subscription state ────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    setIsSupported(true);
    setIsDenied(Notification.permission === "denied");

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        if (!sub) {
          setIsSubscribed(false);
          return;
        }
        // A browser-level push subscription exists — but the user may have
        // opted out of THIS court specifically. Check the DB row.
        const { count } = await supabase
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("court_id", courtId)
          .filter("subscription_json->>endpoint", "eq", sub.endpoint);
        setIsSubscribed(!!count && count > 0);
      } catch (err) {
        console.error("SW init error:", err);
      }
    })();
  }, [courtId]);

  // ── Subscribe ─────────────────────────────────────────────────────────────
  const subscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setIsDenied(true);
        return;
      }
      if (permission !== "granted") return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const { error } = await supabase.from("subscriptions").insert({
        court_id: courtId,
        subscription_json: sub.toJSON(),
      });

      if (error) {
        // Roll back the browser-side subscription so state stays consistent.
        await sub.unsubscribe();
        console.error("Subscription save error:", error);
        return;
      }

      setIsSubscribed(true);
    } catch (err) {
      console.error("Subscribe error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [courtId]);

  // ── Unsubscribe ───────────────────────────────────────────────────────────
  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        setIsSubscribed(false);
        return;
      }

      // Delete only the DB row for this court. We intentionally do NOT call
      // sub.unsubscribe() here — the browser-level push subscription should
      // stay alive so the user remains subscribed to any other courts.
      await supabase
        .from("subscriptions")
        .delete()
        .eq("court_id", courtId)
        .filter("subscription_json->>endpoint", "eq", sub.endpoint);

      setIsSubscribed(false);
    } catch (err) {
      console.error("Unsubscribe error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [courtId]);

  const toggle = useCallback(() => {
    if (isSubscribed) return unsubscribe();
    return subscribe();
  }, [isSubscribed, subscribe, unsubscribe]);

  return { isSupported, isSubscribed, isLoading, isDenied, toggle };
}
