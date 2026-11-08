import 'package:flutter/foundation.dart';

import '../services/push_service.dart';
import 'slots_controller.dart' show SafeNotifier;

/// Notification state for one court (bell button + hint banner).
class CourtNotificationsController extends SafeNotifier {
  CourtNotificationsController({required this.courtId, required this.userId});

  final String courtId;
  final String userId;
  final _push = PushService.instance;

  bool get isSupported => _push.isAvailable;
  bool initialized = false;
  bool subscribed = false;
  bool loading = false;
  bool denied = false;

  Future<void> init() async {
    if (!_push.isAvailable) {
      initialized = true;
      notify();
      return;
    }
    try {
      final p = await _push.permission();
      denied = p == PushPermission.denied;
      if (p == PushPermission.granted) {
        subscribed = await _push.isSubscribed(courtId);
      }
    } catch (e) {
      debugPrint('notification init failed: $e');
    }
    initialized = true;
    notify();
  }

  Future<void> toggle() async {
    if (loading || !_push.isAvailable) return;
    loading = true;
    notify();
    try {
      if (subscribed) {
        await _push.unsubscribe(courtId);
        subscribed = false;
      } else {
        final p = await _push.requestPermission();
        denied = p == PushPermission.denied;
        if (p == PushPermission.granted) {
          subscribed = await _push.subscribe(courtId, userId);
        }
      }
    } catch (e) {
      debugPrint('notification toggle failed: $e');
    }
    loading = false;
    notify();
  }
}
