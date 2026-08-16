import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { trackInstallEvent } from "@/lib/installTracking";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert the base64url VAPID public key to the Uint8Array the browser needs. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const result = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) result[i] = rawData.charCodeAt(i);
  return result;
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UsePushNotificationsResult {
  /** Whether the browser supports push and the service worker is ready. */
  isSupported: boolean;
  /** Whether browser and court subscription state has finished loading. */
  isInitialized: boolean;
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

/**
 * @param courtId  – the court to manage notifications for
 * @param userId   – stable per-device UUID; stored with the subscription so
 *                   the edge function can skip notifying the slot creator
 */
export function usePushNotifications(courtId: string, userId = ""): UsePushNotificationsResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDenied, setIsDenied] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // ── Bootstrap: register SW and check current subscription state ────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!VAPID_PUBLIC_KEY) return; // env var not configured — disable push silently

    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time browser capability detection on mount
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

        // If the subscription was created with a different VAPID key it is
        // permanently invalid. Unsubscribe, purge DB rows, clear asked-flags.
        const existingKey = sub.options?.applicationServerKey;
        if (existingKey) {
          const current = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
          const existing = new Uint8Array(existingKey as ArrayBuffer);
          const mismatch =
            current.length !== existing.length ||
            current.some((b, i) => b !== existing[i]);
          if (mismatch) {
            await sub.unsubscribe();
            await supabase
              .from("subscriptions")
              .delete()
              .filter("subscription_json->>endpoint", "eq", sub.endpoint);
            for (const k of Object.keys(localStorage)) {
              if (k.startsWith("notify-asked-")) localStorage.removeItem(k);
            }
            setIsSubscribed(false);
            return;
          }
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
      } finally {
        setIsInitialized(true);
      }
    })();
  }, [courtId]);

  // ── Subscribe ─────────────────────────────────────────────────────────────
  const subscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      trackInstallEvent("notification_requested");
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

      const { error } = await supabase.from("subscriptions").upsert(
        { court_id: courtId, subscription_json: sub.toJSON(), user_id: userId },
        { ignoreDuplicates: true }, // ON CONFLICT DO NOTHING — idempotent subscribe
      );

      if (error) {
        // Roll back the browser-side subscription so state stays consistent.
        await sub.unsubscribe();
        console.error("Subscription save error:", error);
        return;
      }

      setIsSubscribed(true);
  trackInstallEvent("push_subscribed");
    } catch (err) {
      console.error("Subscribe error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [courtId, userId]);

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

  return { isSupported, isInitialized, isSubscribed, isLoading, isDenied, toggle };
}
