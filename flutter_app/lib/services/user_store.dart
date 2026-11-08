import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../models/models.dart';

/// Local identity (display name + stable device UUID) and the list of
/// recently visited courts. Replaces the cookies of the web version.
class UserStore extends ChangeNotifier {
  UserStore._(this._prefs) {
    _username = _prefs.getString(_kUsername);
    var id = _prefs.getString(_kUserId);
    if (id == null || id.isEmpty) {
      id = const Uuid().v4();
      _prefs.setString(_kUserId, id);
    }
    _userId = id;
    _recent = _readRecent();
    // Sync existing users to the DB (mirrors the web version).
    final name = _username;
    if (name != null) _syncUser(name);
  }

  static const _kUsername = 'court_username';
  static const _kUserId = 'court_user_id';
  static const _kRecent = 'recent_courts';
  static const _maxRecent = 5;

  static late final UserStore instance;

  static void init(SharedPreferences prefs) {
    instance = UserStore._(prefs);
  }

  final SharedPreferences _prefs;
  String? _username;
  late String _userId;
  late List<RecentCourt> _recent;

  String? get username => _username;
  String get userId => _userId;
  List<RecentCourt> get recentCourts => List.unmodifiable(_recent);

  Future<void> setUsername(String name) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return;
    await _prefs.setString(_kUsername, trimmed);
    _username = trimmed;
    notifyListeners();
    _syncUser(trimmed);
  }

  Future<void> _syncUser(String name) async {
    try {
      await Supabase.instance.client
          .from('users')
          .upsert({'id': _userId, 'username': name}, onConflict: 'id');
    } catch (e) {
      debugPrint('users upsert error: $e');
    }
  }

  // ── Recent courts ──────────────────────────────────────────────────────────

  List<RecentCourt> _readRecent() {
    final raw = _prefs.getString(_kRecent);
    if (raw == null) return [];
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      return list
          .map((e) => RecentCourt.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  void _writeRecent() {
    _prefs.setString(
      _kRecent,
      jsonEncode(_recent.map((c) => c.toJson()).toList()),
    );
    notifyListeners();
  }

  void addRecentCourt(String slug, String name) {
    _recent = [
      RecentCourt(slug: slug, name: name),
      ..._recent.where((c) => c.slug != slug),
    ].take(_maxRecent).toList();
    _writeRecent();
  }

  void removeRecentCourt(String slug) {
    _recent = _recent.where((c) => c.slug != slug).toList();
    _writeRecent();
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  /// Removes name, device ID and recent courts (FAQ "App-Daten löschen").
  /// A fresh device ID is generated right away.
  Future<void> clearAll() async {
    await _prefs.remove(_kUsername);
    await _prefs.remove(_kRecent);
    _username = null;
    _recent = [];
    _userId = const Uuid().v4();
    await _prefs.setString(_kUserId, _userId);
    notifyListeners();
  }
}
