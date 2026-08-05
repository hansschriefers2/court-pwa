// Supabase Edge Function — notify-new-pinboard-message
//
// Triggered by a Database Webhook on: table=pinboard_messages, event=INSERT
// The webhook sends a POST with body: { type, table, record, schema, old_record }
//
// Required secrets (set via `supabase secrets set` or the Dashboard):
//   VAPID_PUBLIC_KEY   — base64url-encoded uncompressed P-256 public point
//   VAPID_PRIVATE_KEY  — base64url-encoded 32-byte P-256 private scalar
//   VAPID_SUBJECT      — e.g. "mailto:you@example.com"
//   SUPABASE_URL       — auto-injected by Supabase
//   SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

// ─── VAPID setup ──────────────────────────────────────────────────────────────

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ─── Handler ──────────────────────────────────────────────────────────────────

interface PinboardMessageRecord {
  id: string;
  court_id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: PinboardMessageRecord;
  schema: string;
  old_record: PinboardMessageRecord | null;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  subscription_json: webpush.PushSubscription;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { court_id: courtId, user_id: posterId, username, message } = payload.record ?? {};
  if (!courtId) {
    return new Response("Missing court_id in record", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fetch the court slug for the notification click target.
  const { data: court } = await supabase
    .from("courts")
    .select("slug, name")
    .eq("id", courtId)
    .maybeSingle();

  const { data: subs, error: subsError } = await supabase
    .from("subscriptions")
    .select("id, user_id, subscription_json")
    .eq("court_id", courtId)
    .neq("user_id", posterId ?? "");

  if (subsError) {
    console.error("DB error fetching subscriptions:", subsError);
    return new Response("DB error", { status: 500 });
  }

  const courtLabel = court?.name ?? court?.slug ?? "Court";
  const courtSlug = court?.slug ?? null;

  const notificationPayload = JSON.stringify({
    title: `Neue Nachricht in ${courtLabel}`,
    body: `${username ?? "Jemand"}: ${message}`,
    courtSlug,
    // Deep-link directly to the pinboard tab.
    url: courtSlug ? `/${courtSlug}/pinnwand` : "/",
  });

  const staleIds: string[] = [];

  if (subs?.length) {
    await Promise.allSettled(
      (subs as SubscriptionRow[]).map(async (row) => {
        try {
          await webpush.sendNotification(row.subscription_json, notificationPayload, {
            urgency: "high",
          });
        } catch (err: unknown) {
          if (
            err !== null &&
            typeof err === "object" &&
            "statusCode" in err &&
            (err.statusCode === 403 || err.statusCode === 404 || err.statusCode === 410)
          ) {
            staleIds.push(row.id);
          } else {
            console.error("Push send error for subscription", row.id, err);
          }
        }
      }),
    );

    if (staleIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("subscriptions")
        .delete()
        .in("id", staleIds);
      if (deleteError) {
        console.error("Failed to clean up stale subscriptions:", deleteError);
      }
    }
  }

  const sent = (subs?.length ?? 0) - staleIds.length;
  console.log(`Notified ${sent} subscriber(s), removed ${staleIds.length} stale.`);

  return new Response(
    JSON.stringify({ sent, stale: staleIds.length }),
    { headers: { "Content-Type": "application/json" } },
  );
});
