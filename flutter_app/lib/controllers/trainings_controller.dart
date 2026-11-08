import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/models.dart';
import '../services/court_repository.dart' show db;
import 'slots_controller.dart' show SafeNotifier;

/// Recurring trainings of a court, kept live via Realtime.
class TrainingsController extends SafeNotifier {
  TrainingsController(this.courtId);

  final String courtId;
  List<RecurringTraining> trainings = const [];
  RealtimeChannel? _channel;

  void start() {
    fetch();
    // No server-side filter: DELETE events only carry the primary key, so a
    // court_id filter would drop them. INSERT/UPDATE are filtered here.
    _channel = db
        .channel('court-trainings-$courtId')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'trainings',
          callback: _onChange,
        )
        .subscribe();
  }

  void _onChange(PostgresChangePayload payload) {
    switch (payload.eventType) {
      case PostgresChangeEvent.insert:
        final row = payload.newRecord;
        if (row['court_id'] != courtId) return;
        if (trainings.any((t) => t.id == row['id'])) return;
        trainings = [...trainings, RecurringTraining.fromRow(row)];
        notify();
      case PostgresChangeEvent.update:
        final row = payload.newRecord;
        if (row['court_id'] != courtId) return;
        final t = RecurringTraining.fromRow(row);
        trainings = [for (final x in trainings) x.id == t.id ? t : x];
        notify();
      case PostgresChangeEvent.delete:
        final id = payload.oldRecord['id'];
        trainings = trainings.where((t) => t.id != id).toList();
        notify();
      default:
        break;
    }
  }

  Future<void> fetch() async {
    try {
      final rows = await db
          .from('trainings')
          .select(RecurringTraining.columns)
          .eq('court_id', courtId)
          .order('day_of_week')
          .order('start_min');
      trainings = rows.map(RecurringTraining.fromRow).toList();
      notify();
    } catch (e) {
      debugPrint('trainings fetch failed: $e');
    }
  }

  /// Creates or updates a training. Returns an error message or null.
  Future<String?> save({
    String? id,
    required String label,
    required int dayOfWeek,
    required int startMin,
    required int endMin,
    required String userId,
    required String username,
  }) async {
    if (endMin <= startMin) return 'Das Ende muss nach dem Start liegen.';
    final fields = {
      'label': label.trim().isEmpty ? 'Training' : label.trim(),
      'day_of_week': dayOfWeek,
      'start_min': startMin,
      'end_min': endMin,
    };
    try {
      if (id != null) {
        await db.from('trainings').update(fields).eq('id', id);
      } else {
        await db.from('trainings').insert({
          ...fields,
          'court_id': courtId,
          'created_by_user_id': userId,
          'created_by_username': username,
        });
      }
    } on PostgrestException catch (e) {
      return e.message;
    } catch (e) {
      return e.toString();
    }
    return null;
  }

  Future<void> delete(String id) async {
    try {
      await db.from('trainings').delete().eq('id', id);
    } catch (e) {
      debugPrint('training delete failed: $e');
    }
  }

  @override
  void dispose() {
    final c = _channel;
    if (c != null) db.removeChannel(c);
    super.dispose();
  }
}
