import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config.dart';
import 'router.dart';
import 'services/push_service.dart';
import 'services/user_store.dart';
import 'theme.dart';

final scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (!Config.isValid) {
    runApp(const _ConfigErrorApp());
    return;
  }

  await Supabase.initialize(
    url: Config.supabaseUrl,
    anonKey: Config.supabaseKey,
  );
  UserStore.init(await SharedPreferences.getInstance());

  final push = PushService.instance;
  push.onOpenLocation = appRouter.go;
  push.onForegroundMessage = (title, body, location) {
    scaffoldMessengerKey.currentState?.showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 6),
        content: Text(body.isEmpty ? title : '$title\n$body'),
        action: SnackBarAction(
          label: 'Öffnen',
          onPressed: () => appRouter.go(location),
        ),
      ),
    );
  };
  await push.init();

  runApp(const CourtApp());
}

class CourtApp extends StatefulWidget {
  const CourtApp({super.key});

  @override
  State<CourtApp> createState() => _CourtAppState();
}

class _CourtAppState extends State<CourtApp> {
  @override
  void initState() {
    super.initState();
    // Open the court if the app was launched by tapping a notification.
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => PushService.instance.handleInitialMessage(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Court',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      routerConfig: appRouter,
      scaffoldMessengerKey: scaffoldMessengerKey,
      locale: const Locale('de', 'DE'),
      supportedLocales: const [Locale('de', 'DE')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}

class _ConfigErrorApp extends StatelessWidget {
  const _ConfigErrorApp();

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        body: Center(
          child: Padding(
            padding: EdgeInsets.all(32),
            child: Text(
              'Supabase ist nicht konfiguriert.\n\n'
              'Starte die App mit\n'
              'flutter run --dart-define-from-file=config.json\n'
              '(siehe config.example.json).',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ),
    );
  }
}
