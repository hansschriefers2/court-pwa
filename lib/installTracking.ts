export type InstallEvent =
  | "install_help_viewed"
  | "standalone_opened"
  | "notification_requested"
  | "push_subscribed";

export function trackInstallEvent(event: InstallEvent) {
  if (typeof window === "undefined") return;
  const key = `court-event-${event}`;
  const previous = Number(localStorage.getItem(key) ?? "0");
  localStorage.setItem(key, String(previous + 1));
  window.dispatchEvent(new CustomEvent("court:install-event", { detail: { event } }));
}