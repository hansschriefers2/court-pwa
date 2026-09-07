"use client";

import { useEffect, useRef, useState } from "react";
import type { RecurringTraining, TimeSlot } from "@/lib/types";
import {
  stackSlots,
  buildHeatmapData,
  toMinutes,
  localDateStr,
  formatDateLabel,
  buildCalendarGrid,
  WEEKDAY_LABELS,
  MONTH_NAMES,
} from "@/lib/utils/timeline";

// ─── Constants ───────────────────────────────────────────────────────────────

const PX_PER_MIN = 2; // 2 px per minute → 2880 px total for 24 h
const DAY_START_MIN = 0;
const DAY_END_MIN = 24 * 60; // 1440
const HOURS = Array.from({ length: 25 }, (_, i) => i); // 0 … 24

// ─── Sub-components ──────────────────────────────────────────────────────────

function UtilDot({ count, minPeople }: { count: number; minPeople: number }) {
  if (!count) return <span className="block h-1" />;
  const opacity = Math.min(count / minPeople, 1);
  return (
    <span
      className="block rounded-full bg-lime-500"
      style={{ width: 4, height: 4, opacity }}
    />
  );
}

const BAR_H = 36; // px
const ROW_GAP = 8; // px
const TIMELINE_PADDING_TOP = 50; // px — space for hour labels + heatmap bar

// ─── Training helpers ────────────────────────────────────────────────────────

function stackTrainings(trainings: RecurringTraining[]): RecurringTraining[][] {
  const sorted = [...trainings].sort((a, b) => a.startMin - b.startMin);
  const rows: RecurringTraining[][] = [];
  for (const t of sorted) {
    let placed = false;
    for (const row of rows) {
      const overlaps = row.some((r) => r.startMin < t.endMin && r.endMin > t.startMin);
      if (!overlaps) { row.push(t); placed = true; break; }
    }
    if (!placed) rows.push([t]);
  }
  return rows;
}

interface TrainingBarsProps {
  rows: RecurringTraining[][];
  slots: TimeSlot[];
  userId?: string;
  onTrainingTap?: (training: RecurringTraining) => void;
  topOffset: number;
}

function TrainingBars({ rows, slots, userId, onTrainingTap, topOffset }: TrainingBarsProps) {
  return (
    <>
      {rows.map((row, rowIdx) =>
        row.map((training) => {
          const left = (training.startMin - DAY_START_MIN) * PX_PER_MIN;
          const width = (training.endMin - training.startMin) * PX_PER_MIN;
          const top = topOffset + rowIdx * (BAR_H + ROW_GAP);
          const hasResponse = userId
            ? slots.some((s) => s.trainingId === training.id && s.userId === userId && s.status !== 'declined')
            : false;
          return (
            <div
              key={training.id}
              data-testid="training-item"
              onClick={() => onTrainingTap?.(training)}
              className={[
                "absolute flex items-center gap-1.5 rounded-full border-2 border-dashed px-3 text-sm font-medium select-none cursor-pointer active:scale-95 transition-transform overflow-hidden",
                hasResponse
                  ? "border-violet-300 bg-violet-100 text-violet-600"
                  : "border-violet-500 bg-violet-50 text-violet-800",
              ].join(" ")}
              style={{ left, width, top, height: BAR_H }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500" aria-hidden="true" />
              <span className="truncate">{training.label}</span>
            </div>
          );
        })
      )}
    </>
  );
}

// ─── Slot bars ────────────────────────────────────────────────────────────────

interface SlotBarsProps {
  rows: TimeSlot[][];
  userId?: string;
  onSlotTap?: (slot: TimeSlot) => void;
  onForeignSlotTap?: (slot: TimeSlot) => void;
  topOffset: number;
}

function SlotBars({ rows, userId, onSlotTap, onForeignSlotTap, topOffset }: SlotBarsProps) {
  return (
    <>
      {rows.map((row, rowIdx) =>
        row.map((slot) => {
          const left = (slot.startMin - DAY_START_MIN) * PX_PER_MIN;
          const width = (slot.endMin - slot.startMin) * PX_PER_MIN;
          const top = topOffset + rowIdx * (BAR_H + ROW_GAP);
          const isOwn = userId && slot.userId === userId;
          const { status } = slot;
          const displayName = slot.name;
          return (
            <div
              key={slot.id}
              data-testid="slot-item"
              onClick={isOwn ? () => onSlotTap?.(slot) : () => onForeignSlotTap?.(slot)}
              className={[
                "absolute flex items-center justify-center gap-1.5 rounded-full border text-sm font-medium select-none overflow-hidden px-3",
                isOwn && status === 'declined'
                  ? "border-red-300 bg-red-50 text-red-600 cursor-pointer active:scale-95 transition-transform"
                  : isOwn && status === 'tentative'
                  ? "border-amber-400 bg-amber-50 text-amber-800 cursor-pointer active:scale-95 transition-transform"
                  : isOwn
                  ? "border-lime-400 bg-lime-50 text-gray-800 cursor-pointer active:scale-95 transition-transform"
                  : status === 'declined'
                  ? "border-red-200 bg-red-50 text-red-500"
                  : status === 'tentative'
                  ? "border-amber-300 bg-amber-50 text-amber-700 cursor-pointer active:scale-95 transition-transform"
                  : "border-gray-300 bg-white text-gray-800 cursor-pointer active:scale-95 transition-transform",
              ].join(" ")}
              style={{ left, width, top, height: BAR_H }}
            >
              <span className="truncate">{displayName}</span>
              {status === 'tentative' && (
                <span className="shrink-0 rounded-full bg-amber-200 px-1 py-0.5 text-[10px] font-semibold leading-none text-amber-700">
                  ?
                </span>
              )}
              {status === 'declined' && (
                <span className="shrink-0 rounded-full bg-red-200 px-1 py-0.5 text-[10px] font-semibold leading-none text-red-600">
                  ✗
                </span>
              )}
            </div>
          );
        })
      )}
    </>
  );
}

interface MiniCalendarProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
  utilizationByDate?: Map<string, number>;
  minPeople: number;
}

function MiniCalendar({ selectedDate, onSelect, onClose, utilizationByDate, minPeople }: MiniCalendarProps) {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [onClose]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const grid = buildCalendarGrid(viewYear, viewMonth);
  const today = new Date();

  return (
    <div
      ref={ref}
      className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-72 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl"
    >
      {/* Month navigation */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          aria-label="Vorheriger Monat"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          aria-label="Nächster Monat"
        >
          ›
        </button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-gray-400">
        {WEEKDAY_LABELS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      {/* Day grid */}
      {grid.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 text-center">
          {week.map((day, di) => {
            if (!day) return <span key={di} />;
            const isSelected =
              day.getFullYear() === selectedDate.getFullYear() &&
              day.getMonth() === selectedDate.getMonth() &&
              day.getDate() === selectedDate.getDate();
            const isToday =
              day.getFullYear() === today.getFullYear() &&
              day.getMonth() === today.getMonth() &&
              day.getDate() === today.getDate();
            return (
              <button
                key={di}
                onClick={() => { onSelect(day); onClose(); }}
                className={[
                  "mx-auto my-0.5 flex h-9 w-9 flex-col items-center justify-center gap-0.5 rounded-full text-sm transition-colors",
                  isSelected
                    ? "bg-lime-400 text-gray-900"
                    : isToday
                    ? "border border-gray-400 text-gray-800 hover:bg-gray-100"
                    : "text-gray-700 hover:bg-gray-100",
                ].join(" ")}
              >
                <span className="leading-none">{day.getDate()}</span>
                {!isSelected && (
                  <UtilDot
                    count={utilizationByDate?.get(localDateStr(day)) ?? 0}
                    minPeople={minPeople}
                  />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

type ActiveTab = "heute" | "morgen" | "custom";

interface CourtSchedulerProps {
  /** Live slots from Supabase — omit to show hardcoded sample data. */
  slots?: TimeSlot[];
  /** Called whenever the user switches the active date. */
  onDateChange?: (date: Date) => void;
  /** Called when the user taps the "+" FAB. */
  onAddSlot?: () => void;
  /** The current user's stable UUID — own slots are styled differently and tappable. */
  userId?: string;
  /** Called when the user taps one of their own slots. */
  onSlotTap?: (slot: TimeSlot) => void;
  /** Called when the user taps a slot belonging to someone else. */
  onForeignSlotTap?: (slot: TimeSlot) => void;
  /** Minimum number of distinct users required for a group-availability highlight. */
  minPeople?: number;
  /** Distinct-user counts per date (YYYY-MM-DD) for the utilization dots. */
  utilizationByDate?: Map<string, number>;
  /** Recurring training templates matching the currently viewed weekday. */
  trainings?: RecurringTraining[];
  /** Called when the user taps a training bar. */
  onTrainingTap?: (training: RecurringTraining) => void;
  /** Whether slots for the current date are still being fetched. */
  loading?: boolean;
}

export default function CourtScheduler({ slots, onDateChange, onAddSlot, userId, onSlotTap, onForeignSlotTap, minPeople, utilizationByDate, trainings, onTrainingTap, loading }: CourtSchedulerProps = {}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("heute");
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [currentTimeMin, setCurrentTimeMin] = useState(() => toMinutes(new Date()));

  const effectiveMinPeople = minPeople ?? 2;

  const todayStr = localDateStr(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = localDateStr(tomorrowDate);
  const selectedDateStr = localDateStr(selectedDate);
  const weekdayLabel = WEEKDAY_LABELS[(selectedDate.getDay() + 6) % 7];
  const customDateLabel =
    selectedDateStr === todayStr || selectedDateStr === tomorrowStr
      ? "Datum wählen"
      : `${weekdayLabel} ${formatDateLabel(selectedDate)}`;

  const rows = stackSlots(slots || []);
  const heatmapSegments = buildHeatmapData(slots || []);
  const trainingRows = stackTrainings(trainings || []);
  const trainingAreaH =
    trainingRows.length > 0
      ? trainingRows.length * (BAR_H + ROW_GAP) + ROW_GAP
      : 0;
  const slotOffset = TIMELINE_PADDING_TOP + trainingAreaH;
  const slotAreaH =
    slotOffset +
    rows.length * (BAR_H + ROW_GAP) +
    ROW_GAP; // total inner height

  // ── Scroll to initial position (next slot → next training → now) ──────────
  function calculateScrollTarget(): number {
    const todayStr = localDateStr(new Date());
    const isToday = localDateStr(selectedDate) === todayStr;
    const filterMin = isToday ? toMinutes(new Date()) : 0; // Use current time for today, midnight for other dates

    // Priority 1: next start of an existing slot
    const futureSlots = (slots || []).filter((s) => s.startMin > filterMin);
    if (futureSlots.length > 0) {
      const nextSlot = futureSlots.reduce((min, s) => s.startMin < min.startMin ? s : min);
      return nextSlot.startMin * PX_PER_MIN;
    }

    // Priority 2: start of a training
    const futureTrainings = (trainings || []).filter((t) => t.startMin > filterMin);
    if (futureTrainings.length > 0) {
      const nextTraining = futureTrainings.reduce((min, t) => t.startMin < min.startMin ? t : min);
      return nextTraining.startMin * PX_PER_MIN;
    }

    // Priority 3: current time (or midnight for other dates)
    return filterMin * PX_PER_MIN;
  }

  function scrollToInitial() {
    const container = scrollRef.current;
    if (!container) return;
    const target = calculateScrollTarget() - container.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }

  // Slots for a newly selected date arrive asynchronously (fetched by the
  // parent), so wait for loading to finish before locking in the scroll.
  const scrolledDateRef = useRef<string | null>(null);
  useEffect(() => {
    if (loading || scrolledDateRef.current === selectedDateStr) return;
    scrolledDateRef.current = selectedDateStr;
    scrollToInitial();
  }, [selectedDateStr, slots, trainings, loading]);

  // ── Update current time every minute ──────────────────────────────────────
  useEffect(() => {
    setCurrentTimeMin(toMinutes(new Date()));
    const interval = setInterval(() => {
      setCurrentTimeMin(toMinutes(new Date()));
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // ── Inner content width (full day + some padding) ─────────────────────────
  const innerWidth = DAY_END_MIN * PX_PER_MIN; // 2880 px

  return (
    <div className="relative flex h-full flex-col bg-gray-100">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 px-4 pt-4 pb-3">
        <button
          onClick={() => {
            const today = new Date();
            setActiveTab("heute");
            setSelectedDate(today);
            setCalendarOpen(false);
            scrollToInitial();
            onDateChange?.(today);
          }}
          className={[
            "flex flex-col items-center rounded-lg border px-3 py-1 text-sm font-medium transition-colors",
            activeTab === "heute"
              ? "border-lime-400 bg-lime-400 text-gray-900"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
          ].join(" ")}
        >
          <span>Heute</span>
          {activeTab !== "heute" && (
            <UtilDot count={utilizationByDate?.get(todayStr) ?? 0} minPeople={effectiveMinPeople} />
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab("morgen");
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setSelectedDate(tomorrow);
            setCalendarOpen(false);
            onDateChange?.(tomorrow);
          }}
          className={[
            "flex flex-col items-center rounded-lg border px-3 py-1 text-sm font-medium transition-colors",
            activeTab === "morgen"
              ? "border-lime-400 bg-lime-400 text-gray-900"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
          ].join(" ")}
        >
          <span>Morgen</span>
          {activeTab !== "morgen" && (
            <UtilDot count={utilizationByDate?.get(tomorrowStr) ?? 0} minPeople={effectiveMinPeople} />
          )}
        </button>

        {/* Date button + calendar dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setActiveTab("custom");
              setCalendarOpen((o) => !o);
            }}
            className={[
              "flex flex-col items-center rounded-lg border px-3 py-1 text-sm font-medium transition-colors",
              activeTab === "custom"
                ? "border-lime-400 bg-lime-400 text-gray-900"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
            ].join(" ")}
          >
            <span>{customDateLabel}</span>
          </button>

          {calendarOpen && (
            <MiniCalendar
              selectedDate={selectedDate}
              onSelect={(d) => {
                const nextDateStr = localDateStr(d);
                setSelectedDate(d);
                setActiveTab(
                  nextDateStr === todayStr
                    ? "heute"
                    : nextDateStr === tomorrowStr
                      ? "morgen"
                      : "custom",
                );
                onDateChange?.(d);
              }}
              onClose={() => setCalendarOpen(false)}
              utilizationByDate={utilizationByDate}
              minPeople={effectiveMinPeople}
            />
          )}
        </div>
      </div>

      {/* ── Scrollable timeline ─────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="relative flex-1 overflow-x-auto overflow-y-hidden"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {/* Inner content — fixed pixel width */}
        <div
          className="relative"
          style={{ width: innerWidth, height: slotAreaH, minHeight: "100%" }}
        >
          {/* Hour labels */}
          {HOURS.map((h) => {
            const left = h * 60 * PX_PER_MIN;
            return (
              <span
                key={h}
                className="absolute top-0 -translate-x-1/2 text-xs text-gray-400"
                style={{ left }}
              >
                {String(h).padStart(2, "0")}:00
              </span>
            );
          })}

          {/* Vertical grid lines */}
          {HOURS.map((h) => {
            const left = h * 60 * PX_PER_MIN;
            return (
              <div
                key={h}
                className="absolute top-4 bottom-0 w-px bg-gray-300"
                style={{ left }}
              />
            );
          })}

          {/* Heatmap — one segment per distinct time interval in the label row */}
          {heatmapSegments.map((seg, i) => {
            const isFirst = i === 0 || heatmapSegments[i - 1].end !== seg.start;
            const isLast = i === heatmapSegments.length - 1 || heatmapSegments[i + 1].start !== seg.end;
            const opacity = seg.count >= effectiveMinPeople
              ? 0.8
              : (seg.count / effectiveMinPeople) * 0.55;
            const r = 6;
            const borderRadius = [
              isFirst ? `${r}px` : "0",
              isLast  ? `${r}px` : "0",
              isLast  ? `${r}px` : "0",
              isFirst ? `${r}px` : "0",
            ].join(" ");
            return (
              <div
                key={i}
                className="absolute pointer-events-none flex items-center justify-center overflow-hidden"
                style={{
                  left: (seg.start - DAY_START_MIN) * PX_PER_MIN,
                  width: (seg.end - seg.start) * PX_PER_MIN,
                  top: 20,
                  height: 22,
                  backgroundColor: `rgba(163,230,53,${opacity})`,
                  borderRadius,
                }}
              >
                <span className="text-[10px] font-medium text-gray-400 leading-none select-none">{seg.count}</span>
              </div>
            );
          })}

          {/* Training bars */}
          {trainingRows.length > 0 && (
            <TrainingBars
              rows={trainingRows}
              slots={slots || []}
              userId={userId}
              onTrainingTap={onTrainingTap}
              topOffset={TIMELINE_PADDING_TOP}
            />
          )}

          {/* Slot bars */}
          <SlotBars rows={rows} userId={userId} onSlotTap={onSlotTap} onForeignSlotTap={onForeignSlotTap} topOffset={slotOffset} />

          {/* Current time indicator */}
          <div
            className="absolute top-0 bottom-0 bg-red-500 pointer-events-none opacity-60"
            style={{ left: currentTimeMin * PX_PER_MIN, width: "2px" }}
          />
        </div>
      </div>

      {/* ── FAB ─────────────────────────────────────────────────── */}
      <button
        onClick={() => onAddSlot?.()}
        className="absolute bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-xl border border-lime-400 bg-lime-400 text-2xl text-gray-900 shadow-md hover:bg-lime-300 active:scale-95 transition-transform"
        aria-label="Neuen Slot hinzufügen"
      >
        +
      </button>
    </div>
  );
}
