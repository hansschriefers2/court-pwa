/// Build-time configuration, injected with
/// `flutter run --dart-define-from-file=config.json`.
class Config {
  Config._();

  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');

  /// Supabase ≥ 2.x calls this the publishable key; the legacy anon key works too.
  static const supabaseKey = String.fromEnvironment(
    'SUPABASE_PUBLISHABLE_KEY',
    defaultValue: String.fromEnvironment('SUPABASE_ANON_KEY'),
  );

  /// Base URL of the web version, used for share links (e.g. https://court.example).
  /// Optional – without it, only the court's short name is shared.
  static const webBaseUrl = String.fromEnvironment('WEB_BASE_URL');

  static bool get isValid => supabaseUrl.isNotEmpty && supabaseKey.isNotEmpty;
}
