import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import 'screens/court_loader.dart';
import 'screens/court_screen.dart';
import 'screens/home_screen.dart';
import 'screens/info_screens.dart';
import 'screens/pinboard_screen.dart';
import 'widgets/username_gate.dart';

/// Same URL structure as the web version, so notification deep links
/// (`/slug`, `/slug/pinnwand`) work unchanged. Static routes come first.
final appRouter = GoRouter(
  routes: [
    GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
    GoRoute(path: '/faq', builder: (_, __) => const FaqScreen()),
    GoRoute(path: '/impressum', builder: (_, __) => const ImpressumScreen()),
    GoRoute(path: '/datenschutz', builder: (_, __) => const DatenschutzScreen()),
    GoRoute(
      path: '/:slug',
      builder: (_, state) {
        final slug = state.pathParameters['slug']!.toLowerCase();
        return CourtLoader(
          key: ValueKey('court-$slug'),
          slug: slug,
          builder: (_, court) => UsernameGate(
            courtName: court.name,
            builder: (_, username) =>
                CourtScreen(court: court, username: username),
          ),
        );
      },
      routes: [
        GoRoute(
          path: 'pinnwand',
          builder: (_, state) {
            final slug = state.pathParameters['slug']!.toLowerCase();
            return CourtLoader(
              key: ValueKey('pinboard-$slug'),
              slug: slug,
              builder: (_, court) => UsernameGate(
                courtName: court.name,
                builder: (_, username) =>
                    PinboardScreen(court: court, username: username),
              ),
            );
          },
        ),
      ],
    ),
  ],
);
