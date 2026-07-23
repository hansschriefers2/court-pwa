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
  user_id: string;
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

  const { court_id: courtId, user_name: bookedBy, user_id: bookerId, date: slotDate } = payload.record ?? {};
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
    .select("slug, name, min_people")
    .eq("id", courtId)
    .maybeSingle();

  const minPeople: number = court?.min_people ?? 2;

  const { data: subs, error: subsError } = await supabase
    .from("subscriptions")
    .select("id, subscription_json")
    .eq("court_id", courtId)
    .neq("user_id", bookerId ?? "");

  if (subsError) {
    console.error("DB error fetching subscriptions:", subsError);
    return new Response("DB error", { status: 500 });
  }

  const toTime = (min: number) =>
    `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

  function datePart(d: string | undefined): string {
    if (!d) return "";
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    if (d === todayStr) return " heute";
    if (d === tomorrowStr) return " morgen";
    const [year, month, day] = d.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return " am " + date.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  }

  const { start_min, end_min } = payload.record ?? {};
  const timeRange =
    start_min != null && end_min != null
      ? ` von ${toTime(start_min)} bis ${toTime(end_min)}`
      : "";

  const notificationPayload = JSON.stringify({
    title: `Neuer Slot in ${court?.slug ?? court?.name ?? "Court"}`,
    body: `${bookedBy ?? "Jemand"} hat${datePart(slotDate)}${timeRange} Zeit`,
    courtSlug: court?.slug ?? null,
  });

  const staleIds: string[] = [];

  if (subs?.length) {
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
  }

  const sent = subs.length - staleIds.length;
  console.log(`Notified ${sent} subscriber(s), removed ${staleIds.length} stale.`);

  // ─── Group availability check ─────────────────────────────────────────────
  // When exactly min_people distinct users have overlapping slots, the threshold
  // is crossed for the first time → notify all of them.
  // count > min_people means the threshold was already crossed before → skip.
  let groupSent = 0;

  if (slotDate && payload.record.start_min != null && payload.record.end_min != null) {
    const { data: overlapping } = await supabase
      .from("slots")
      .select("user_id, user_name, start_min, end_min")
      .eq("court_id", courtId)
      .eq("date", slotDate)
      .lt("start_min", payload.record.end_min)
      .gt("end_min", payload.record.start_min);

    if (overlapping?.length) {
      // One entry per distinct user (earliest slot wins if they have multiple)
      const byUser = new Map<string, { user_id: string; user_name: string; start_min: number; end_min: number }>();
      for (const s of overlapping) {
        if (!byUser.has(s.user_id)) byUser.set(s.user_id, s);
      }
      const distinctUsers = [...byUser.values()];

      if (distinctUsers.length === minPeople) {
        // Compute common intersection window
        const intersectionStart = Math.max(...distinctUsers.map((s) => s.start_min));
        const intersectionEnd = Math.min(...distinctUsers.map((s) => s.end_min));

        if (intersectionStart < intersectionEnd) {
          const groupUserIds = distinctUsers.map((u) => u.user_id);

          const { data: groupSubs } = await supabase
            .from("subscriptions")
            .select("id, user_id, subscription_json")
            .eq("court_id", courtId)
            .in("user_id", groupUserIds);

          if (groupSubs?.length) {
            const groupPayload = JSON.stringify({
              title: `Gemeinsamer Slot in ${court?.name ?? court?.slug ?? "Court"}`,
              body: `${minPeople} Personen haben${datePart(slotDate)} von ${toTime(intersectionStart)} bis ${toTime(intersectionEnd)} gleichzeitig Zeit!`,
              courtSlug: court?.slug ?? null,
            });

            const staleGroupIds: string[] = [];
            await Promise.allSettled(
              (groupSubs as SubscriptionRow[]).map(async (row) => {
                try {
                  await webpush.sendNotification(row.subscription_json, groupPayload);
                  groupSent++;
                } catch (err: unknown) {
                  if (
                    err !== null &&
                    typeof err === "object" &&
                    "statusCode" in err &&
                    (err.statusCode === 404 || err.statusCode === 410)
                  ) {
                    staleGroupIds.push(row.id);
                  } else {
                    console.error("Group push error for subscription", row.id, err);
                  }
                }
              }),
            );

            if (staleGroupIds.length > 0) {
              await supabase.from("subscriptions").delete().in("id", staleGroupIds);
            }

            console.log(`Group notification sent to ${groupSent} subscriber(s) (${minPeople}-person overlap).`);
          }
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ sent, stale: staleIds.length, groupSent }),
    { headers: { "Content-Type": "application/json" } },
  );
});
