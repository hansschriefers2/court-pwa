import '../models/models.dart';

// ─── Date / time ─────────────────────────────────────────────────────────────

String _pad2(int n) => n.toString().padLeft(2, '0');

/// Local YYYY-MM-DD string.
String localDateStr(DateTime date) =>
    '${date.year}-${_pad2(date.month)}-${_pad2(date.day)}';

/// Minutes from midnight for a given DateTime.
int toMinutes(DateTime date) => date.hour * 60 + date.minute;

/// "d.M.YYYY" display label.
String formatDateLabel(DateTime date) =>
    '${date.day}.${date.month}.${date.year}';

/// Nearest 30-minute mark as "HH:MM" (pre-fills the slot form).
String defaultStartTime([DateTime? now]) {
  final n = now ?? DateTime.now();
  final rounded = ((n.minute / 30).round()) * 30;
  final h = rounded == 60 ? n.hour + 1 : n.hour;
  final m = rounded == 60 ? 0 : rounded;
  return '${_pad2(h % 24)}:${_pad2(m)}';
}

/// "HH:MM" → minutes from midnight.
int timeStrToMin(String t) {
  final parts = t.split(':');
  return int.parse(parts[0]) * 60 + int.parse(parts[1]);
}

/// Minutes from midnight → "HH:MM".
String minToTimeStr(int min) => '${_pad2(min ~/ 60)}:${_pad2(min % 60)}';

DateTime dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

bool isSameDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;

/// JS-style weekday (0 = Sunday … 6 = Saturday), as stored in `trainings.day_of_week`.
int jsWeekday(DateTime d) => d.weekday % 7;

// ─── Calendar ─────────────────────────────────────────────────────────────────

/// Monday-first labels.
const weekdayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/// Sunday-first labels (index = JS weekday), used for trainings.
const weekdayShortJs = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

const monthNames = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', //
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

/// Monday-first calendar grid for [year]/[month] (1-12).
/// Each row has 7 cells; padding days are `null`.
List<List<DateTime?>> buildCalendarGrid(int year, int month) {
  final startOffset = DateTime(year, month, 1).weekday - 1; // 0 = Mon
  final daysInMonth = DateTime(year, month + 1, 0).day;
  final cells = <DateTime?>[
    for (var i = 0; i < startOffset; i++) null,
    for (var d = 1; d <= daysInMonth; d++) DateTime(year, month, d),
  ];
  while (cells.length % 7 != 0) {
    cells.add(null);
  }
  return [
    for (var i = 0; i < cells.length; i += 7) cells.sublist(i, i + 7),
  ];
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

class HeatSegment {
  const HeatSegment(this.start, this.end, this.count);
  final int start;
  final int end;
  final int count;

  @override
  bool operator ==(Object other) =>
      other is HeatSegment &&
      other.start == start &&
      other.end == end &&
      other.count == count;

  @override
  int get hashCode => Object.hash(start, end, count);

  @override
  String toString() => 'HeatSegment($start-$end: $count)';
}

/// One segment per distinct time interval with the number of accepted slots
/// covering it. Used for the heatmap in the timeline header.
List<HeatSegment> buildHeatmapData(List<TimeSlot> slots) {
  final accepted =
      slots.where((s) => s.status == SlotStatus.accepted).toList();
  if (accepted.isEmpty) return const [];

  final points = {
    for (final s in accepted) ...[s.startMin, s.endMin],
  }.toList()
    ..sort();

  final result = <HeatSegment>[];
  for (var i = 0; i < points.length - 1; i++) {
    final mid = (points[i] + points[i + 1]) / 2;
    final count =
        accepted.where((s) => s.startMin <= mid && s.endMin > mid).length;
    if (count > 0) result.add(HeatSegment(points[i], points[i + 1], count));
  }
  return result;
}

// ─── Stacking ─────────────────────────────────────────────────────────────────

/// Greedy row packing, grouped by status (accepted rows first, then
/// tentative, then declined).
List<List<TimeSlot>> stackSlots(List<TimeSlot> slots) {
  final rows = <List<TimeSlot>>[];
  for (final status in SlotStatus.values) {
    final sorted = slots.where((s) => s.status == status).toList()
      ..sort((a, b) => a.startMin.compareTo(b.startMin));
    rows.addAll(_pack(sorted, (s) => s.startMin, (s) => s.endMin));
  }
  return rows;
}

List<List<RecurringTraining>> stackTrainings(List<RecurringTraining> t) {
  final sorted = [...t]..sort((a, b) => a.startMin.compareTo(b.startMin));
  return _pack(sorted, (x) => x.startMin, (x) => x.endMin);
}

List<List<T>> _pack<T>(
  List<T> sorted,
  int Function(T) start,
  int Function(T) end,
) {
  final rows = <List<T>>[];
  for (final item in sorted) {
    var placed = false;
    for (final row in rows) {
      final overlaps =
          row.any((r) => start(r) < end(item) && end(r) > start(item));
      if (!overlaps) {
        row.add(item);
        placed = true;
        break;
      }
    }
    if (!placed) rows.add([item]);
  }
  return rows;
}
