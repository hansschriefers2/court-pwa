import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../models/models.dart';
import '../theme.dart';
import '../utils/timeline.dart';
import 'common.dart';
import 'mini_calendar.dart';

// ─── Layout constants (same as the web version) ──────────────────────────────

const double _pxPerMin = 2; // 2 px per minute → 2880 px for 24 h
const double _barH = 36;
const double _rowGap = 8;
const double _paddingTop = 50; // hour labels + heatmap
const double _innerWidth = 24 * 60 * _pxPerMin;

/// Horizontal 24-hour timeline with date tabs, heatmap, trainings and slots.
class CourtScheduler extends StatefulWidget {
  const CourtScheduler({
    super.key,
    required this.selectedDate,
    required this.slots,
    required this.loading,
    required this.userId,
    required this.minPeople,
    required this.utilizationByDate,
    required this.trainings,
    required this.onDateChange,
    required this.onAddSlot,
    required this.onSlotTap,
    required this.onForeignSlotTap,
    required this.onTrainingTap,
  });

  final DateTime selectedDate;
  final List<TimeSlot> slots;
  final bool loading;
  final String userId;
  final int minPeople;
  final Map<String, int> utilizationByDate;

  /// Trainings for the selected weekday.
  final List<RecurringTraining> trainings;

  final ValueChanged<DateTime> onDateChange;
  final VoidCallback onAddSlot;
  final ValueChanged<TimeSlot> onSlotTap;
  final ValueChanged<TimeSlot> onForeignSlotTap;
  final ValueChanged<RecurringTraining> onTrainingTap;

  @override
  State<CourtScheduler> createState() => _CourtSchedulerState();
}

class _CourtSchedulerState extends State<CourtScheduler> {
  final _hScroll = ScrollController();
  Timer? _clock;
  int _nowMin = toMinutes(DateTime.now());
  String? _scrolledDate;

  @override
  void initState() {
    super.initState();
    _clock = Timer.periodic(const Duration(minutes: 1), (_) {
      if (mounted) setState(() => _nowMin = toMinutes(DateTime.now()));
    });
    _maybeScrollInitial();
  }

  @override
  void didUpdateWidget(CourtScheduler oldWidget) {
    super.didUpdateWidget(oldWidget);
    _maybeScrollInitial();
  }

  @override
  void dispose() {
    _clock?.cancel();
    _hScroll.dispose();
    super.dispose();
  }

  // Slots for a newly selected date arrive asynchronously, so wait for
  // loading to finish before locking in the scroll position.
  void _maybeScrollInitial() {
    final dateStr = localDateStr(widget.selectedDate);
    if (widget.loading || _scrolledDate == dateStr) return;
    _scrolledDate = dateStr;
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToInitial());
  }

  /// Next slot → next training → now (today) / midnight (other days).
  double _scrollTarget() {
    final isToday = isSameDay(widget.selectedDate, DateTime.now());
    final filterMin = isToday ? toMinutes(DateTime.now()) : 0;

    final futureSlots = widget.slots.where((s) => s.startMin > filterMin);
    if (futureSlots.isNotEmpty) {
      return futureSlots.map((s) => s.startMin).reduce(math.min) * _pxPerMin;
    }
    final futureTrainings =
        widget.trainings.where((t) => t.startMin > filterMin);
    if (futureTrainings.isNotEmpty) {
      return futureTrainings.map((t) => t.startMin).reduce(math.min) *
          _pxPerMin;
    }
    return filterMin * _pxPerMin;
  }

  void _scrollToInitial() {
    if (!mounted || !_hScroll.hasClients) return;
    final pos = _hScroll.position;
    final target = (_scrollTarget() - pos.viewportDimension / 2)
        .clamp(0.0, pos.maxScrollExtent);
    _hScroll.animateTo(
      target,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeOut,
    );
  }

  Future<void> _openCalendar() async {
    final picked = await MiniCalendar.show(
      context,
      selectedDate: widget.selectedDate,
      utilizationByDate: widget.utilizationByDate,
      minPeople: widget.minPeople,
    );
    if (picked != null) widget.onDateChange(dateOnly(picked));
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final today = dateOnly(now);
    final tomorrow = today.add(const Duration(days: 1));
    final sel = widget.selectedDate;
    final isToday = isSameDay(sel, today);
    final isTomorrow = isSameDay(sel, tomorrow);
    final customLabel = isToday || isTomorrow
        ? 'Datum wählen'
        : '${weekdayLabels[sel.weekday - 1]} ${formatDateLabel(sel)}';

    final slots = widget.loading ? const <TimeSlot>[] : widget.slots;
    final rows = stackSlots(slots);
    final heat = buildHeatmapData(slots);
    final trainingRows = stackTrainings(widget.trainings);
    final trainingAreaH = trainingRows.isEmpty
        ? 0.0
        : trainingRows.length * (_barH + _rowGap) + _rowGap;
    final headerH = _paddingTop + trainingAreaH;
    final slotsH = rows.length * (_barH + _rowGap) + _rowGap;
    final bottomSafe = MediaQuery.of(context).padding.bottom;

    return Stack(
      children: [
        Column(
          children: [
            // ── Date tabs ───────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
              child: Row(
                children: [
                  _DateTab(
                    label: 'Heute',
                    active: isToday,
                    dot: isToday
                        ? null
                        : UtilDot(
                            count: widget
                                    .utilizationByDate[localDateStr(today)] ??
                                0,
                            minPeople: widget.minPeople,
                          ),
                    onTap: () {
                      _scrolledDate = null;
                      widget.onDateChange(today);
                    },
                  ),
                  const SizedBox(width: 8),
                  _DateTab(
                    label: 'Morgen',
                    active: isTomorrow,
                    dot: isTomorrow
                        ? null
                        : UtilDot(
                            count: widget.utilizationByDate[
                                    localDateStr(tomorrow)] ??
                                0,
                            minPeople: widget.minPeople,
                          ),
                    onTap: () => widget.onDateChange(tomorrow),
                  ),
                  const SizedBox(width: 8),
                  _DateTab(
                    label: customLabel,
                    active: !isToday && !isTomorrow,
                    onTap: _openCalendar,
                  ),
                ],
              ),
            ),

            // ── Timeline ────────────────────────────────────────────────
            Expanded(
              child: SingleChildScrollView(
                controller: _hScroll,
                scrollDirection: Axis.horizontal,
                child: SizedBox(
                  width: _innerWidth,
                  child: Column(
                    children: [
                      // Header: stays on top while the slot area scrolls vertically.
                      SizedBox(
                        height: headerH,
                        child: Stack(
                          clipBehavior: Clip.hardEdge,
                          children: [
                            for (var h = 0; h <= 24; h++)
                              Positioned(
                                left: h * 60 * _pxPerMin - 20,
                                top: 0,
                                width: 40,
                                child: Text(
                                  '${h.toString().padLeft(2, '0')}:00',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.gray400,
                                  ),
                                ),
                              ),
                            ..._heatmap(heat),
                            for (var r = 0; r < trainingRows.length; r++)
                              for (final t in trainingRows[r])
                                _positioned(
                                  t.startMin,
                                  t.endMin,
                                  _paddingTop + r * (_barH + _rowGap),
                                  _TrainingBar(
                                    training: t,
                                    hasResponse: slots.any((s) =>
                                        s.trainingId == t.id &&
                                        s.userId == widget.userId &&
                                        s.status != SlotStatus.declined),
                                    onTap: () => widget.onTrainingTap(t),
                                  ),
                                ),
                          ],
                        ),
                      ),
                      // Slot area.
                      Expanded(
                        child: Stack(
                          children: [
                            Positioned.fill(
                              child: CustomPaint(
                                painter: _GridPainter(nowMin: _nowMin),
                              ),
                            ),
                            Positioned.fill(
                              child: SingleChildScrollView(
                                padding: EdgeInsets.only(bottom: 80 + bottomSafe),
                                child: SizedBox(
                                  height: slotsH,
                                  width: _innerWidth,
                                  child: Stack(
                                    children: [
                                      for (var r = 0; r < rows.length; r++)
                                        for (final s in rows[r])
                                          _positioned(
                                            s.startMin,
                                            s.endMin,
                                            _rowGap + r * (_barH + _rowGap),
                                            _SlotBar(
                                              slot: s,
                                              isOwn: s.userId == widget.userId,
                                              onTap: () => s.userId == widget.userId
                                                  ? widget.onSlotTap(s)
                                                  : widget.onForeignSlotTap(s),
                                            ),
                                          ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        if (widget.loading)
          const Positioned(
            top: 64,
            left: 0,
            right: 0,
            child: LinearProgressIndicator(
              minHeight: 2,
              color: AppColors.lime500,
              backgroundColor: Colors.transparent,
            ),
          ),

        // ── FAB ───────────────────────────────────────────────────────────
        Positioned(
          right: 24,
          bottom: math.max(24.0, bottomSafe + 12),
          child: Material(
            color: AppColors.lime400,
            elevation: 3,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: widget.onAddSlot,
              child: const SizedBox(
                width: 48,
                height: 48,
                child: Icon(Icons.add, color: AppColors.gray900, size: 28,
                    semanticLabel: 'Neuen Slot hinzufügen'),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _positioned(int startMin, int endMin, double top, Widget child) =>
      Positioned(
        left: startMin * _pxPerMin,
        width: math.max(0.0, (endMin - startMin) * _pxPerMin),
        top: top,
        height: _barH,
        child: child,
      );

  List<Widget> _heatmap(List<HeatSegment> segs) => [
        for (var i = 0; i < segs.length; i++) _heatSegment(segs, i),
      ];

  Widget _heatSegment(List<HeatSegment> segs, int i) {
    const r = Radius.circular(6);
    final seg = segs[i];
    final isFirst = i == 0 || segs[i - 1].end != seg.start;
    final isLast = i == segs.length - 1 || segs[i + 1].start != seg.end;
    final mp = widget.minPeople <= 0 ? 1 : widget.minPeople;
    final opacity =
        seg.count >= mp ? 0.8 : (seg.count / mp) * 0.55;
    return Positioned(
      left: seg.start * _pxPerMin,
      width: (seg.end - seg.start) * _pxPerMin,
      top: 20,
      height: 22,
      child: IgnorePointer(
        child: Container(
          alignment: Alignment.center,
          clipBehavior: Clip.hardEdge,
          decoration: BoxDecoration(
            color: AppColors.lime400.withValues(alpha: opacity),
            borderRadius: BorderRadius.only(
              topLeft: isFirst ? r : Radius.zero,
              bottomLeft: isFirst ? r : Radius.zero,
              topRight: isLast ? r : Radius.zero,
              bottomRight: isLast ? r : Radius.zero,
            ),
          ),
          child: Text(
            '${seg.count}',
            maxLines: 1,
            overflow: TextOverflow.clip,
            style: const TextStyle(
              fontSize: 10,
              height: 1,
              fontWeight: FontWeight.w500,
              color: AppColors.gray400,
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Sub-widgets ─────────────────────────────────────────────────────────────

class _DateTab extends StatelessWidget {
  const _DateTab({
    required this.label,
    required this.active,
    required this.onTap,
    this.dot,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;
  final Widget? dot;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: active ? AppColors.lime400 : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(
          color: active ? AppColors.lime400 : AppColors.gray300,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: active ? AppColors.gray900 : AppColors.gray700,
                ),
              ),
              dot ?? const SizedBox(height: 4),
            ],
          ),
        ),
      ),
    );
  }
}

/// Text (+ optional badge) inside a bar; hides content when the bar is too
/// narrow instead of overflowing.
class _BarContent extends StatelessWidget {
  const _BarContent({
    required this.text,
    required this.color,
    this.leading,
    this.trailing,
    this.center = true,
  });

  final String text;
  final Color color;
  final Widget? leading;
  final Widget? trailing;
  final bool center;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, c) {
      final pad = math.min(12.0, c.maxWidth / 6);
      final inner = c.maxWidth - 2 * pad;
      final extras = (leading != null ? 14 : 0) + (trailing != null ? 20 : 0);
      if (inner < extras + 12) {
        return const SizedBox.shrink();
      }
      return Padding(
        padding: EdgeInsets.symmetric(horizontal: pad),
        child: Row(
          mainAxisAlignment:
              center ? MainAxisAlignment.center : MainAxisAlignment.start,
          children: [
            if (leading != null) ...[leading!, const SizedBox(width: 6)],
            Flexible(
              child: Text(
                text,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: color,
                ),
              ),
            ),
            if (trailing != null) ...[const SizedBox(width: 6), trailing!],
          ],
        ),
      );
    });
  }
}

class _TrainingBar extends StatelessWidget {
  const _TrainingBar({
    required this.training,
    required this.hasResponse,
    required this.onTap,
  });

  final RecurringTraining training;
  final bool hasResponse;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final borderColor =
        hasResponse ? AppColors.violet300 : AppColors.violet500;
    return GestureDetector(
      onTap: onTap,
      child: CustomPaint(
        foregroundPainter: _DashedPillPainter(color: borderColor),
        child: Container(
          decoration: BoxDecoration(
            color: hasResponse ? AppColors.violet100 : AppColors.violet50,
            borderRadius: BorderRadius.circular(_barH / 2),
          ),
          child: _BarContent(
            text: training.label,
            center: false,
            color: hasResponse ? AppColors.violet600 : AppColors.violet800,
            leading: Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: AppColors.violet500,
                shape: BoxShape.circle,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SlotBar extends StatelessWidget {
  const _SlotBar({required this.slot, required this.isOwn, required this.onTap});

  final TimeSlot slot;
  final bool isOwn;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final (Color border, Color bg, Color fg) = switch ((isOwn, slot.status)) {
      (true, SlotStatus.declined) =>
        (AppColors.red300, AppColors.red50, AppColors.red600),
      (true, SlotStatus.tentative) =>
        (AppColors.amber400, AppColors.amber50, AppColors.amber800),
      (true, SlotStatus.accepted) =>
        (AppColors.lime400, AppColors.lime50, AppColors.gray800),
      (false, SlotStatus.declined) =>
        (AppColors.red200, AppColors.red50, AppColors.red500),
      (false, SlotStatus.tentative) =>
        (AppColors.amber300, AppColors.amber50, AppColors.amber700),
      (false, SlotStatus.accepted) =>
        (AppColors.gray300, Colors.white, AppColors.gray800),
    };

    Widget? badge;
    if (slot.status == SlotStatus.tentative) {
      badge = const _Badge('?', AppColors.amber200, AppColors.amber700);
    } else if (slot.status == SlotStatus.declined) {
      badge = const _Badge('✗', AppColors.red200, AppColors.red600);
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: bg,
          border: Border.all(color: border),
          borderRadius: BorderRadius.circular(_barH / 2),
        ),
        child: _BarContent(text: slot.name, color: fg, trailing: badge),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge(this.text, this.bg, this.fg);
  final String text;
  final Color bg;
  final Color fg;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          text,
          style: TextStyle(
            fontSize: 10,
            height: 1,
            fontWeight: FontWeight.w600,
            color: fg,
          ),
        ),
      );
}

// ─── Painters ────────────────────────────────────────────────────────────────

class _GridPainter extends CustomPainter {
  const _GridPainter({required this.nowMin});
  final int nowMin;

  @override
  void paint(Canvas canvas, Size size) {
    final line = Paint()
      ..color = AppColors.gray300
      ..strokeWidth = 1;
    for (var h = 0; h <= 24; h++) {
      final x = h * 60 * _pxPerMin + 0.5;
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), line);
    }
    final now = Paint()
      ..color = AppColors.red500.withValues(alpha: 0.6)
      ..strokeWidth = 2;
    final x = nowMin * _pxPerMin + 1;
    canvas.drawLine(Offset(x, 0), Offset(x, size.height), now);
  }

  @override
  bool shouldRepaint(_GridPainter old) => old.nowMin != nowMin;
}

class _DashedPillPainter extends CustomPainter {
  const _DashedPillPainter({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    if (size.width < 4) return;
    final rect = (Offset.zero & size).deflate(1);
    final path = Path()
      ..addRRect(RRect.fromRectAndRadius(rect, Radius.circular(rect.height / 2)));
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    for (final metric in path.computeMetrics()) {
      var d = 0.0;
      while (d < metric.length) {
        final end = math.min(d + 6, metric.length);
        canvas.drawPath(metric.extractPath(d, end), paint);
        d += 10;
      }
    }
  }

  @override
  bool shouldRepaint(_DashedPillPainter old) => old.color != color;
}
