// Firebase Cloud Messaging (HTTP v1) helper for the edge functions.
//
// Required secret (optional – without it FCM sending is skipped):
//   FCM_SERVICE_ACCOUNT — the full JSON of a Firebase service account key
//                         (Firebase console → Project settings → Service accounts
//                         → Generate new private key)

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

export interface FcmTokenRow {
  id: string;
  token: string;
}

export interface FcmMessage {
  title: string;
  body: string;
  courtSlug: string | null;
  /** App route to open on tap, e.g. "/slug/pinnwand". Defaults to "/slug". */
  url?: string;
}

function loadServiceAccount(): ServiceAccount | null {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT");
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw);
    if (!sa.project_id || !sa.client_email || !sa.private_key) {
      console.error("FCM_SERVICE_ACCOUNT is missing project_id/client_email/private_key");
      return null;
    }
    return sa;
  } catch (err) {
    console.error("FCM_SERVICE_ACCOUNT is not valid JSON:", err);
    return null;
  }
}

const serviceAccount = loadServiceAccount();

// ─── OAuth access token (JWT bearer flow, cached per isolate) ────────────────

let cachedToken: { value: string; expiresAt: number } | null = null;

function base64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.value;

  const enc = new TextEncoder();
  const header = base64url(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = base64url(
    enc.encode(
      JSON.stringify({
        iss: sa.client_email,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      }),
    ),
  );
  const unsigned = `${header}.${claims}`;

  const pem = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\\n/g, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(unsigned)),
  );
  const jwt = `${unsigned}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google OAuth token request failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  cachedToken = { value: json.access_token, expiresAt: now + (json.expires_in ?? 3600) };
  return cachedToken.value;
}

// ─── Sending ─────────────────────────────────────────────────────────────────

/** True if the FCM error means the token will never work again. */
function isStaleTokenError(status: number, body: unknown): boolean {
  if (status === 404) return true; // UNREGISTERED
  const details = (body as { error?: { details?: { errorCode?: string }[] } })?.error?.details;
  const code = details?.find((d) => d.errorCode)?.errorCode;
  return code === "UNREGISTERED" || code === "SENDER_ID_MISMATCH";
}

/**
 * Sends [msg] to every row and deletes tokens that FCM reports as invalid.
 * Does nothing (returns zeros) if FCM_SERVICE_ACCOUNT is not configured.
 */
export async function sendFcm(
  supabase: SupabaseClient,
  rows: FcmTokenRow[],
  msg: FcmMessage,
): Promise<{ sent: number; stale: number }> {
  if (!serviceAccount || rows.length === 0) return { sent: 0, stale: 0 };

  let accessToken: string;
  try {
    accessToken = await getAccessToken(serviceAccount);
  } catch (err) {
    console.error("FCM auth error:", err);
    return { sent: 0, stale: 0 };
  }

  const endpoint =
    `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;
  const tag = msg.courtSlug ? `court-${msg.courtSlug}` : "court-slot";
  const url = msg.url ?? (msg.courtSlug ? `/${msg.courtSlug}` : "/");

  let sent = 0;
  const staleIds: string[] = [];

  await Promise.allSettled(
    rows.map(async (row) => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: row.token,
            notification: { title: msg.title, body: msg.body },
            data: { courtSlug: msg.courtSlug ?? "", url },
            android: {
              priority: "HIGH",
              // Collapse notifications per court (like the web `tag`).
              notification: { tag },
            },
            apns: {
              headers: { "apns-priority": "10" },
              payload: { aps: { sound: "default", "thread-id": tag } },
            },
          },
        }),
      });
      if (res.ok) {
        sent++;
        return;
      }
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        // ignore
      }
      if (isStaleTokenError(res.status, body)) {
        staleIds.push(row.id);
      } else {
        console.error("FCM send error for token row", row.id, res.status, JSON.stringify(body));
      }
    }),
  );

  if (staleIds.length > 0) {
    const { error } = await supabase.from("fcm_tokens").delete().in("id", staleIds);
    if (error) console.error("Failed to clean up stale FCM tokens:", error);
  }

  return { sent, stale: staleIds.length };
}
