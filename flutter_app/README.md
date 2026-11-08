# Court – Flutter-App (Android & iOS)

Native Version der Court-PWA. Sie nutzt **dasselbe Supabase-Backend** wie die Web-App: Plätze, Slots, Trainings und Pinnwand sind zwischen Web und App geteilt und live synchronisiert.

## Funktionsumfang

| Web-App (Next.js) | Flutter |
| --- | --- |
| Startseite: zuletzt besucht, Platz öffnen, Platz anlegen | `screens/home_screen.dart` |
| Court-Ansicht mit 24-h-Zeitleiste, Heatmap, Heute/Morgen/Kalender, Auslastungspunkte | `screens/court_screen.dart`, `widgets/court_scheduler.dart`, `widgets/mini_calendar.dart` |
| Slot anlegen / bearbeiten / löschen, fremden Slot als Vorlage übernehmen | `widgets/slot_sheets.dart` |
| Wiederkehrende Trainings verwalten und zu-/absagen | `widgets/manage_trainings_sheet.dart`, `widgets/slot_sheets.dart` |
| Pinnwand mit Live-Updates | `screens/pinboard_screen.dart` |
| Benutzername + Geräte-ID (Cookies) | `services/user_store.dart` (SharedPreferences) |
| Web-Push (VAPID) | Firebase Cloud Messaging, `services/push_service.dart` |
| FAQ, Impressum, Datenschutz | `screens/info_screens.dart` |

Entfallen sind nur PWA-spezifische Teile (Installationsanleitung, iOS-Homescreen-Hinweise, Service Worker).

Die Routen entsprechen der Web-App (`/`, `/:slug`, `/:slug/pinnwand`, `/faq` …), deshalb funktionieren die Deep-Links aus den Benachrichtigungen unverändert.

## Einrichtung

Voraussetzung: Flutter ≥ 3.27 (Dart ≥ 3.6), Xcode für iOS.

### 1. Native Projektordner erzeugen

Im Repo liegen nur `lib/`, `test/`, `assets/` und `pubspec.yaml`. Die Ordner `android/` und `ios/` erzeugt Flutter:

```bash
cd flutter_app
flutter create . --platforms=android,ios --org de.court --project-name court
flutter pub get
dart run flutter_launcher_icons
```

`flutter create .` überschreibt keine vorhandenen Dateien in `lib/`. Falls es eine `test/widget_test.dart` anlegt, kannst du sie löschen.

### 2. Supabase-Zugang

```bash
cp config.example.json config.json   # Werte aus dem Supabase "Connect"-Panel eintragen
flutter run --dart-define-from-file=config.json
```

`WEB_BASE_URL` ist optional und wird nur für den „Teilen“-Link genutzt.

### 3. Push-Benachrichtigungen (Firebase)

Ohne Firebase läuft die App vollständig, nur die Glocke ist ausgeblendet.

1. Firebase-Projekt anlegen und die FlutterFire-CLI einrichten:
   ```bash
   dart pub global activate flutterfire_cli
   flutterfire configure --platforms=android,ios
   ```
   Das legt `android/app/google-services.json` und `ios/Runner/GoogleService-Info.plist` an und richtet das Gradle-Plugin ein. Die erzeugte `lib/firebase_options.dart` wird nicht benötigt (die App liest die nativen Dateien), du kannst sie aber behalten.
2. **iOS:** In Xcode (`ios/Runner.xcworkspace`) unter *Signing & Capabilities* „Push Notifications“ und „Background Modes → Remote notifications“ hinzufügen. Im Apple-Developer-Konto einen APNs-Key erzeugen und in Firebase unter *Projekteinstellungen → Cloud Messaging* hochladen.
3. **Android:** Die Berechtigung `POST_NOTIFICATIONS` (Android 13+) bringt `firebase_messaging` mit. Falls der Build eine zu niedrige `minSdk` meldet, in `android/app/build.gradle(.kts)` `minSdk = 23` setzen.
4. **Backend:**
   ```bash
   # neue Tabelle fcm_tokens
   supabase db push
   # Service-Account-Key: Firebase → Projekteinstellungen → Dienstkonten → Neuen privaten Schlüssel generieren
   supabase secrets set FCM_SERVICE_ACCOUNT="$(cat service-account.json)"
   supabase functions deploy notify-new-slot
   supabase functions deploy notify-new-pinboard-message
   ```
   Die Edge Functions schicken weiterhin Web-Push an die PWA **und zusätzlich** FCM an die App. Ist `FCM_SERVICE_ACCOUNT` nicht gesetzt, wird FCM einfach übersprungen.

### Tests

```bash
flutter test      # Zeitleisten-Logik (Stacking, Heatmap, Kalender, Slug)
flutter analyze
```

## Hinweise

- Benachrichtigungen im Vordergrund erscheinen auf iOS als Systembanner, auf Android als Snackbar mit „Öffnen“.
- Ein Tipp auf eine Benachrichtigung öffnet den Court bzw. die Pinnwand, auch aus dem beendeten Zustand.
- Die App erzeugt eine eigene Geräte-ID. Slots, die jemand im Browser angelegt hat, gelten in der App deshalb als „fremd“ (wie auf einem zweiten Gerät).
