import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/models.dart';
import '../services/court_repository.dart' show db;
import 'slots_controller.dart' show SafeNotifier;

/// Pinboard messages of a court, kept live via Realtime.
class PinboardController extends SafeNotifier {
  PinboardController(this.courtId);

  final String courtId;
  List<PinboardMessage> messages = const [];
  bool loading = true;
  RealtimeChannel? _channel;

  void start() {
    fetch();
    final filter = PostgresChangeFilter(
      type: PostgresChangeFilterType.eq,
      column: 'court_id',
      value: courtId,
    );
    _channel = db
        .channel('pinboard:$courtId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'pinboard_messages',
          filter: filter,
          callback: (payload) {
            final msg = PinboardMessage.fromRow(payload.newRecord);
            if (messages.any((m) => m.id == msg.id)) return;
            messages = [...messages, msg];
            notify();
          },
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.delete,
          schema: 'public',
          table: 'pinboard_messages',
          filter: filter,
          callback: (payload) {
            final id = payload.oldRecord['id'];
            messages = messages.where((m) => m.id != id).toList();
            notify();
          },
        )
        .subscribe();
  }

  Future<void> fetch() async {
    loading = true;
    notify();
    try {
      final rows = await db
          .from('pinboard_messages')
          .select(PinboardMessage.columns)
          .eq('court_id', courtId)
          .order('created_at', ascending: true);
      messages = rows.map(PinboardMessage.fromRow).toList();
    } catch (e) {
      debugPrint('pinboard fetch failed: $e');
    }
    loading = false;
    notify();
  }

  Future<bool> add(String text, String username, String userId) async {
    try {
      await db.from('pinboard_messages').insert({
        'court_id': courtId,
        'user_id': userId,
        'username': username,
        'message': text,
      });
      return true;
    } catch (e) {
      debugPrint('pinboard insert failed: $e');
      return false;
    }
  }

  Future<void> delete(String id) async {
    // Optimistic removal.
    messages = messages.where((m) => m.id != id).toList();
    notify();
    try {
      await db.from('pinboard_messages').delete().eq('id', id);
    } catch (e) {
      debugPrint('pinboard delete failed: $e');
    }
  }

  @override
  void dispose() {
    final c = _channel;
    if (c != null) db.removeChannel(c);
    super.dispose();
  }
}
