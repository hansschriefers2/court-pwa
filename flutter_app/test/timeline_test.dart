import 'package:court/models/models.dart';
import 'package:court/services/court_repository.dart' show toSlug;
import 'package:court/utils/timeline.dart';
import 'package:flutter_test/flutter_test.dart';

TimeSlot slot(String id, String user, int start, int end,
        [SlotStatus status = SlotStatus.accepted]) =>
    TimeSlot(
      id: id,
      name: user,
      userId: user,
      startMin: start,
      endMin: end,
      status: status,
    );

void main() {
  group('time helpers', () {
    test('localDateStr pads month and day', () {
      expect(localDateStr(DateTime(2026, 3, 7)), '2026-03-07');
    });

    test('minutes <-> HH:MM', () {
      expect(minToTimeStr(0), '00:00');
      expect(minToTimeStr(18 * 60 + 5), '18:05');
      expect(timeStrToMin('07:30'), 450);
    });

    test('defaultStartTime rounds to nearest half hour', () {
      expect(defaultStartTime(DateTime(2026, 1, 1, 9, 14)), '09:00');
      expect(defaultStartTime(DateTime(2026, 1, 1, 9, 16)), '09:30');
      expect(defaultStartTime(DateTime(2026, 1, 1, 9, 50)), '10:00');
      expect(defaultStartTime(DateTime(2026, 1, 1, 23, 50)), '00:00');
    });

    test('jsWeekday uses 0 = Sunday', () {
      expect(jsWeekday(DateTime(2026, 11, 8)), 0); // Sunday
      expect(jsWeekday(DateTime(2026, 11, 9)), 1); // Monday
    });
  });

  test('buildCalendarGrid is Monday-first and padded to full weeks', () {
    final grid = buildCalendarGrid(2026, 11); // 1 Nov 2026 is a Sunday
    expect(grid.first.take(6).every((d) => d == null), isTrue);
    expect(grid.first[6], DateTime(2026, 11, 1));
    expect(grid.every((w) => w.length == 7), isTrue);
    expect(grid.expand((w) => w).whereType<DateTime>().length, 30);
  });

  test('buildHeatmapData counts accepted slots per interval', () {
    final segs = buildHeatmapData([
      slot('1', 'a', 600, 720),
      slot('2', 'b', 660, 780),
      slot('3', 'c', 600, 900, SlotStatus.tentative), // ignored
    ]);
    expect(segs, const [
      HeatSegment(600, 660, 1),
      HeatSegment(660, 720, 2),
      HeatSegment(720, 780, 1),
    ]);
  });

  test('stackSlots packs non-overlapping slots and groups by status', () {
    final rows = stackSlots([
      slot('1', 'a', 600, 660),
      slot('2', 'b', 630, 700),
      slot('3', 'c', 660, 720),
      slot('4', 'd', 600, 700, SlotStatus.declined),
    ]);
    expect(rows.map((r) => r.map((s) => s.id).toList()).toList(), [
      ['1', '3'],
      ['2'],
      ['4'],
    ]);
  });

  test('toSlug matches the web version', () {
    expect(toSlug('  Stadtpark Platz 1 '), 'stadtpark-platz-1');
    expect(toSlug('Größe Wiese!'), 'gre-wiese');
  });
}
