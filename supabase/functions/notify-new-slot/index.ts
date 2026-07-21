// Supabase Edge Function — notify-new-slot
//
// Triggered by a Database Webhook on: table=slots, event=INSERT
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

interface SlotRecord {
  id: string;
  court_id: string;
  user_name: string;
  date: string;
  start_min: number;
  end_min: number;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: SlotRecord;
  schema: string;
  old_record: SlotRecord | null;
}

interface SubscriptionRow {
  id: string;
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

  const { court_id: courtId, user_name: bookedBy } = payload.record ?? {};
  if (!courtId) {
    return new Response("Missing court_id in record", { status: 400 });
  }

  // Use the service-role key — bypasses RLS so we can read all subscriptions.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fetch the court slug for a nicer notification click target.
  const { data: court } = await supabase
    .from("courts")
    .select("slug, name")
    .eq("id", courtId)
    .maybeSingle();

  const { data: subs, error: subsError } = await supabase
    .from("subscriptions")
    .select("id, subscription_json")
    .eq("court_id", courtId);

  if (subsError) {
    console.error("DB error fetching subscriptions:", subsError);
    return new Response("DB error", { status: 500 });
  }

  if (!subs?.length) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const notificationPayload = JSON.stringify({
    title: court?.name ? `${court.name} — neuer Slot` : "Neuer Slot",
    body: `${bookedBy ?? "Jemand"} hat gerade einen Slot gebucht.`,
    courtSlug: court?.slug ?? null,
  });

  const staleIds: string[] = [];

  await Promise.allSettled(
    (subs as SubscriptionRow[]).map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription_json, notificationPayload);
      } catch (err: unknown) {
        // 404 / 410 means the push subscription has expired — clean it up.
        if (
          err !== null &&
          typeof err === "object" &&
          "statusCode" in err &&
          (err.statusCode === 404 || err.statusCode === 410)
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

  const sent = subs.length - staleIds.length;
  console.log(`Notified ${sent} subscriber(s), removed ${staleIds.length} stale.`);

  return new Response(
    JSON.stringify({ sent, stale: staleIds.length }),
    { headers: { "Content-Type": "application/json" } },
  );
});
