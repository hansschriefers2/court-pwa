"use client";

import { useEffect, useRef, useState } from "react";
import type { TimeSlot } from "@/lib/types";
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

interface SlotBarsProps {
  rows: TimeSlot[][];
  userId?: string;
  onSlotTap?: (slot: TimeSlot) => void;
}

function SlotBars({ rows, userId, onSlotTap }: SlotBarsProps) {
  return (
    <>
      {rows.map((row, rowIdx) =>
        row.map((slot) => {
          const left = (slot.startMin - DAY_START_MIN) * PX_PER_MIN;
          const width = (slot.endMin - slot.startMin) * PX_PER_MIN;
          const top = TIMELINE_PADDING_TOP + rowIdx * (BAR_H + ROW_GAP);
          const isOwn = userId && slot.userId === userId;
          return (
            <div
              key={slot.id}
              data-testid="slot-item"
              onClick={isOwn ? () => onSlotTap?.(slot) : undefined}
              className={[
                "absolute flex items-center justify-center rounded-full border text-sm font-medium select-none",
                isOwn
                  ? "border-lime-400 bg-lime-50 text-gray-800 cursor-pointer active:scale-95 transition-transform"
                  : "border-gray-300 bg-white text-gray-800",
              ].join(" ")}
              style={{ left, width, top, height: BAR_H }}
            >
              {slot.name}
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
  /** Minimum number of distinct users required for a group-availability highlight. */
  minPeople?: number;
  /** Distinct-user counts per date (YYYY-MM-DD) for the utilization dots. */
  utilizationByDate?: Map<string, number>;
}

export default function CourtScheduler({ slots, onDateChange, onAddSlot, userId, onSlotTap, minPeople, utilizationByDate }: CourtSchedulerProps = {}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("heute");
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

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
  const slotAreaH =
    TIMELINE_PADDING_TOP +
    rows.length * (BAR_H + ROW_GAP) +
    ROW_GAP; // total inner height

  // ── Scroll to current time ─────────────────────────────────────────────────
  function scrollToNow() {
    const container = scrollRef.current;
    if (!container) return;
    const nowMin = toMinutes(new Date());
    const target = nowMin * PX_PER_MIN - container.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }

  useEffect(() => {
    scrollToNow();
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
            scrollToNow();
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

          {/* Slot bars */}
          <SlotBars rows={rows} userId={userId} onSlotTap={onSlotTap} />
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
