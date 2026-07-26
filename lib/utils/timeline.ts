import type { TimeSlot } from "@/lib/types";

// ─── Date / time ─────────────────────────────────────────────────────────────

/** Local YYYY-MM-DD string (avoids UTC-offset issues). */
export function localDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Minutes from midnight for a given Date. */
export function toMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** "d.M.YYYY" display label for a Date. */
export function formatDateLabel(date: Date): string {
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
}

/** Returns the nearest 30-minute mark as "HH:MM" (used to pre-fill the slot form). */
export function defaultStartTime(): string {
  const now = new Date();
  const rounded = Math.round(now.getMinutes() / 30) * 30;
  const h = rounded === 60 ? now.getHours() + 1 : now.getHours();
  const m = rounded === 60 ? 0 : rounded;
  return `${String(h % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "HH:MM" string → minutes from midnight. */
export function timeStrToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes from midnight → "HH:MM" string. */
export function minToTimeStr(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

export const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
] as const;

/**
 * Returns a Mon-first calendar grid for a given year/month.
 * Each row is 7 cells; padding days are `null`.
 */
export function buildCalendarGrid(year: number, month: number): (Date | null)[][] {
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // 0=Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array<null>(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

// ─── Slot stacking ────────────────────────────────────────────────────────────

/**
 * Greedy row-packing: assigns each slot to the first row where it doesn't
 * overlap any existing slot. Input is sorted by startMin inside the function.
 */
/**
 * Returns merged time ranges where at least `minPeople` distinct users
 * have overlapping slots. Uses a sweep-line over all slot boundaries.
 */
/**
 * Returns one segment per distinct time interval, each with a distinct-user
 * count. Used to render a heatmap in the timeline header.
 */
export function buildHeatmapData(
  slots: TimeSlot[],
): { start: number; end: number; count: number }[] {
  if (slots.length === 0) return [];

  const points = [...new Set(slots.flatMap((s) => [s.startMin, s.endMin]))].sort(
    (a, b) => a - b,
  );

  return points.slice(0, -1).flatMap((p, i) => {
    const mid = (p + points[i + 1]) / 2;
    const count = new Set(
      slots.filter((s) => s.startMin <= mid && s.endMin > mid).map((s) => s.userId),
    ).size;
    return count > 0 ? [{ start: p, end: points[i + 1], count }] : [];
  });
}

export function findGroupRanges(
  slots: TimeSlot[],
  minPeople: number,
): { start: number; end: number; count: number }[] {
  if (slots.length === 0 || minPeople < 2) return [];

  // Collect every unique boundary point
  const points = [...new Set(slots.flatMap((s) => [s.startMin, s.endMin]))].sort(
    (a, b) => a - b,
  );

  const ranges: { start: number; end: number; count: number }[] = [];
  let inRange = false;
  let rangeStart = 0;
  let rangeCount = 0;

  for (let i = 0; i < points.length - 1; i++) {
    // Sample the midpoint of this interval to find active distinct users
    const mid = (points[i] + points[i + 1]) / 2;
    const activeUsers = new Set(
      slots.filter((s) => s.startMin <= mid && s.endMin > mid).map((s) => s.userId),
    );
    const distinctUsers = activeUsers.size;

    if (distinctUsers >= minPeople) {
      if (!inRange) { inRange = true; rangeStart = points[i]; rangeCount = distinctUsers; }
      else rangeCount = Math.max(rangeCount, distinctUsers);
    } else {
      if (inRange) { inRange = false; ranges.push({ start: rangeStart, end: points[i], count: rangeCount }); }
    }
  }
  if (inRange) ranges.push({ start: rangeStart, end: points[points.length - 1], count: rangeCount });

  return ranges;
}

export function stackSlots(slots: TimeSlot[]): TimeSlot[][] {
  const sorted = [...slots].sort((a, b) => a.startMin - b.startMin);
  const rows: TimeSlot[][] = [];
  for (const slot of sorted) {
    let placed = false;
    for (const row of rows) {
      const overlaps = row.some(
        (s) => s.startMin < slot.endMin && s.endMin > slot.startMin
      );
      if (!overlaps) {
        row.push(slot);
        placed = true;
        break;
      }
    }
    if (!placed) rows.push([slot]);
  }
  return rows;
}
