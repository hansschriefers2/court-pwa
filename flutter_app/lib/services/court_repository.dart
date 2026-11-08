import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/models.dart';

SupabaseClient get db => Supabase.instance.client;

/// Turns a court name into its URL short name ("Stadtpark Platz 1" → "stadtpark-platz-1").
String toSlug(String name) => name
    .trim()
    .toLowerCase()
    .replaceAll(RegExp(r'\s+'), '-')
    .replaceAll(RegExp(r'[^a-z0-9-]'), '');

class CourtRepository {
  CourtRepository._();

  static Future<Court?> fetchBySlug(String slug) async {
    final row = await db
        .from('courts')
        .select(Court.columns)
        .eq('slug', slug)
        .maybeSingle();
    return row == null ? null : Court.fromRow(row);
  }

  /// Inserts a court and returns its slug. Throws [CourtCreateException]
  /// with a user-facing message on failure.
  static Future<String> create(
    String name, {
    String? description,
    String? mapsUrl,
  }) async {
    final trimmed = name.trim();
    final slug = toSlug(trimmed);
    if (slug.isEmpty) {
      throw const CourtCreateException(
          'Bitte nur Buchstaben und Zahlen verwenden.');
    }
    String? orNull(String? s) =>
        (s == null || s.trim().isEmpty) ? null : s.trim();
    try {
      await db.from('courts').insert({
        'name': trimmed,
        'slug': slug,
        'min_people': 4,
        'description': orNull(description),
        'maps_url': orNull(mapsUrl),
      });
    } on PostgrestException catch (e) {
      throw CourtCreateException(e.message);
    }
    return slug;
  }
}

class CourtCreateException implements Exception {
  const CourtCreateException(this.message);
  final String message;
  @override
  String toString() => message;
}
