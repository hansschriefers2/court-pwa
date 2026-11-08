import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/models.dart';
import '../services/court_repository.dart' show db;
import '../utils/timeline.dart';

/// ChangeNotifier that ignores notifications after dispose (async callbacks
/// may finish after the screen is gone).
abstract class SafeNotifier extends ChangeNotifier {
  bool _disposed = false;
  bool get disposed => _disposed;

  void notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}

/// Slots of one court for the currently viewed date, kept live via Realtime.
class SlotsController extends SafeNotifier {
  SlotsController(this.courtId);

  final String courtId;

  List<TimeSlot> slots = const [];
  bool loading = true;
  String? error;
  DateTime currentDate = dateOnly(DateTime.now());

  RealtimeChannel? _channel;
  int _fetchSeq = 0;

  void start() {
    fetch(currentDate);
    _channel = db
        .channel('court-slots-$courtId')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'slots',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'court_id',
            value: courtId,
          ),
          callback: _onChange,
        )
        .subscribe();
  }

  void _onChange(PostgresChangePayload payload) {
    final viewing = localDateStr(currentDate);
    switch (payload.eventType) {
      case PostgresChangeEvent.insert:
        final row = payload.newRecord;
        if (row['date'] == viewing && !slots.any((s) => s.id == row['id'])) {
          slots = [...slots, TimeSlot.fromRow(row)];
          notify();
        }
      case PostgresChangeEvent.update:
        final row = payload.newRecord;
        if (row['date'] == viewing) {
          final updated = TimeSlot.fromRow(row);
          final exists = slots.any((s) => s.id == updated.id);
          slots = exists
              ? [for (final s in slots) s.id == updated.id ? updated : s]
              : [...slots, updated];
        } else {
          // The slot moved to another date – drop it from this view.
          slots = slots.where((s) => s.id != row['id']).toList();
        }
        notify();
      case PostgresChangeEvent.delete:
        final id = payload.oldRecord['id'];
        slots = slots.where((s) => s.id != id).toList();
        notify();
      default:
        break;
    }
  }

  Future<void> fetch(DateTime date) async {
    final seq = ++_fetchSeq;
    loading = true;
    error = null;
    notify();
    try {
      final rows = await db
          .from('slots')
          .select(TimeSlot.columns)
          .eq('court_id', courtId)
          .eq('date', localDateStr(date))
          .order('start_min');
      if (seq != _fetchSeq) return;
      slots = rows.map(TimeSlot.fromRow).toList();
    } on PostgrestException catch (e) {
      if (seq != _fetchSeq) return;
      error = e.message;
    } catch (e) {
      if (seq != _fetchSeq) return;
      error = e.toString();
    }
    loading = false;
    notify();
  }

  void changeDate(DateTime date) {
    currentDate = dateOnly(date);
    fetch(currentDate);
  }

  void refresh() => fetch(currentDate);

  Future<void> deleteSlot(String id) async {
    try {
      await db.from('slots').delete().eq('id', id);
    } catch (e) {
      debugPrint('delete slot failed: $e');
      return;
    }
    slots = slots.where((s) => s.id != id).toList();
    notify();
  }

  @override
  void dispose() {
    final c = _channel;
    if (c != null) db.removeChannel(c);
    super.dispose();
  }
}

/// Distinct-user counts (accepted slots) per date for the next 60 days.
class UtilizationController extends SafeNotifier {
  UtilizationController(this.courtId);

  final String courtId;
  Map<String, int> byDate = const {};

  Future<void> fetch() async {
    final today = DateTime.now();
    final future = today.add(const Duration(days: 60));
    try {
      final rows = await db
          .from('slots')
          .select('date, user_id')
          .eq('court_id', courtId)
          .eq('status', 'accepted')
          .gte('date', localDateStr(today))
          .lte('date', localDateStr(future));
      final users = <String, Set<String>>{};
      for (final row in rows) {
        users
            .putIfAbsent(row['date'] as String, () => <String>{})
            .add(row['user_id'] as String);
      }
      byDate = {for (final e in users.entries) e.key: e.value.length};
      notify();
    } catch (e) {
      debugPrint('utilization fetch failed: $e');
    }
  }
}
