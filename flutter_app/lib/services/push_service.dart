import 'dart:async';
import 'dart:io' show Platform;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import 'court_repository.dart' show db;

enum PushPermission { granted, denied, notDetermined }

/// Firebase Cloud Messaging integration.
///
/// The FCM token is stored per court in `fcm_tokens`; the Supabase edge
/// functions send to every token of a court (except the author's device).
/// If Firebase is not configured (no google-services.json /
/// GoogleService-Info.plist) the service stays disabled and the app works
/// without notifications.
class PushService {
  PushService._();
  static final instance = PushService._();

  bool _available = false;
  bool get isAvailable => _available;

  String? _token;

  /// Called when the user taps a notification. Receives an app route like `/slug`.
  void Function(String location)? onOpenLocation;

  /// Called for messages that arrive while the app is in the foreground on
  /// Android (iOS shows them as system banners itself).
  void Function(String title, String body, String location)? onForegroundMessage;

  Future<void> init() async {
    try {
      await Firebase.initializeApp();
    } catch (e) {
      debugPrint('Firebase not configured – push disabled ($e)');
      return;
    }
    _available = true;
    final m = FirebaseMessaging.instance;

    await m.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    FirebaseMessaging.onMessage.listen((msg) {
      if (!Platform.isAndroid) return;
      final n = msg.notification;
      onForegroundMessage?.call(
        n?.title ?? 'Court',
        n?.body ?? '',
        locationFor(msg),
      );
    });
    FirebaseMessaging.onMessageOpenedApp.listen(
      (msg) => onOpenLocation?.call(locationFor(msg)),
    );
    m.onTokenRefresh.listen(_handleTokenRefresh);
  }

  /// Handles the notification that launched the app from terminated state.
  Future<void> handleInitialMessage() async {
    if (!_available) return;
    final msg = await FirebaseMessaging.instance.getInitialMessage();
    if (msg != null) onOpenLocation?.call(locationFor(msg));
  }

  static String locationFor(RemoteMessage msg) {
    final url = msg.data['url'];
    if (url is String && url.startsWith('/')) return url;
    final slug = msg.data['courtSlug'];
    if (slug is String && slug.isNotEmpty) return '/$slug';
    return '/';
  }

  // ── Permission ─────────────────────────────────────────────────────────────

  static PushPermission _map(AuthorizationStatus s) => switch (s) {
        AuthorizationStatus.authorized ||
        AuthorizationStatus.provisional =>
          PushPermission.granted,
        AuthorizationStatus.denied => PushPermission.denied,
        _ => PushPermission.notDetermined,
      };

  Future<PushPermission> permission() async {
    if (!_available) return PushPermission.notDetermined;
    final s = await FirebaseMessaging.instance.getNotificationSettings();
    return _map(s.authorizationStatus);
  }

  Future<PushPermission> requestPermission() async {
    if (!_available) return PushPermission.notDetermined;
    final s = await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    return _map(s.authorizationStatus);
  }

  // ── Token ──────────────────────────────────────────────────────────────────

  Future<String?> token() async {
    if (!_available) return null;
    if (_token != null) return _token;
    final m = FirebaseMessaging.instance;
    if (Platform.isIOS) {
      // The APNs token can arrive a moment after permission was granted.
      for (var i = 0; i < 5; i++) {
        if (await m.getAPNSToken() != null) break;
        await Future<void>.delayed(const Duration(milliseconds: 500));
      }
    }
    try {
      _token = await m.getToken();
    } catch (e) {
      debugPrint('FCM getToken failed: $e');
    }
    return _token;
  }

  Future<void> _handleTokenRefresh(String newToken) async {
    final old = _token;
    _token = newToken;
    if (old == null || old == newToken) return;
    try {
      await db.from('fcm_tokens').update({
        'token': newToken,
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      }).eq('token', old);
    } catch (e) {
      debugPrint('FCM token refresh sync failed: $e');
    }
  }

  // ── Per-court subscription ─────────────────────────────────────────────────

  Future<bool> isSubscribed(String courtId) async {
    final t = await token();
    if (t == null) return false;
    final rows = await db
        .from('fcm_tokens')
        .select('id')
        .eq('court_id', courtId)
        .eq('token', t)
        .limit(1);
    return rows.isNotEmpty;
  }

  /// Returns true on success.
  Future<bool> subscribe(String courtId, String userId) async {
    final t = await token();
    if (t == null) return false;
    await db.from('fcm_tokens').upsert(
      {
        'court_id': courtId,
        'user_id': userId,
        'token': t,
        'platform': Platform.isIOS ? 'ios' : 'android',
      },
      onConflict: 'court_id,token',
      ignoreDuplicates: true,
    );
    return true;
  }

  Future<void> unsubscribe(String courtId) async {
    final t = await token();
    if (t == null) return;
    await db
        .from('fcm_tokens')
        .delete()
        .eq('court_id', courtId)
        .eq('token', t);
  }

  /// Removes this device's token from every court (used by "App-Daten löschen").
  Future<void> unsubscribeAll() async {
    final t = await token();
    if (t == null) return;
    await db.from('fcm_tokens').delete().eq('token', t);
  }
}
