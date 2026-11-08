import 'package:flutter/material.dart';

import '../theme.dart';
import '../utils/timeline.dart';
import 'common.dart';

/// Month calendar with utilisation dots. Shown in a dialog; pops the
/// selected date.
class MiniCalendar extends StatefulWidget {
  const MiniCalendar({
    super.key,
    required this.selectedDate,
    required this.utilizationByDate,
    required this.minPeople,
  });

  final DateTime selectedDate;
  final Map<String, int> utilizationByDate;
  final int minPeople;

  static Future<DateTime?> show(
    BuildContext context, {
    required DateTime selectedDate,
    required Map<String, int> utilizationByDate,
    required int minPeople,
  }) {
    return showDialog<DateTime>(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: MiniCalendar(
          selectedDate: selectedDate,
          utilizationByDate: utilizationByDate,
          minPeople: minPeople,
        ),
      ),
    );
  }

  @override
  State<MiniCalendar> createState() => _MiniCalendarState();
}

class _MiniCalendarState extends State<MiniCalendar> {
  late int _year = widget.selectedDate.year;
  late int _month = widget.selectedDate.month;

  void _prev() => setState(() {
        if (_month == 1) {
          _year--;
          _month = 12;
        } else {
          _month--;
        }
      });

  void _next() => setState(() {
        if (_month == 12) {
          _year++;
          _month = 1;
        } else {
          _month++;
        }
      });

  @override
  Widget build(BuildContext context) {
    final grid = buildCalendarGrid(_year, _month);
    final today = DateTime.now();

    Widget navButton(String label, VoidCallback onTap, String tooltip) =>
        IconButton(
          tooltip: tooltip,
          onPressed: onTap,
          visualDensity: VisualDensity.compact,
          icon: Text(label,
              style: const TextStyle(fontSize: 20, color: AppColors.gray500)),
        );

    return SizedBox(
      width: 300,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                navButton('‹', _prev, 'Vorheriger Monat'),
                Text(
                  '${monthNames[_month - 1]} $_year',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.gray800,
                  ),
                ),
                navButton('›', _next, 'Nächster Monat'),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                for (final d in weekdayLabels)
                  Expanded(
                    child: Center(
                      child: Text(
                        d,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: AppColors.gray400,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            for (final week in grid)
              Row(
                children: [
                  for (final day in week)
                    Expanded(
                      child: day == null
                          ? const SizedBox(height: 40)
                          : _DayCell(
                              day: day,
                              selected: isSameDay(day, widget.selectedDate),
                              today: isSameDay(day, today),
                              count: widget.utilizationByDate[
                                      localDateStr(day)] ??
                                  0,
                              minPeople: widget.minPeople,
                            ),
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.day,
    required this.selected,
    required this.today,
    required this.count,
    required this.minPeople,
  });

  final DateTime day;
  final bool selected;
  final bool today;
  final int count;
  final int minPeople;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: Center(
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: () => Navigator.of(context).pop(day),
          child: Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: selected ? AppColors.lime400 : null,
              border: !selected && today
                  ? Border.all(color: AppColors.gray400)
                  : null,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '${day.day}',
                  style: TextStyle(
                    fontSize: 14,
                    height: 1,
                    color: selected ? AppColors.gray900 : AppColors.gray700,
                  ),
                ),
                if (!selected) ...[
                  const SizedBox(height: 2),
                  UtilDot(count: count, minPeople: minPeople),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
