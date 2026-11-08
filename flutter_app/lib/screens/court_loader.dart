import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/models.dart';
import '../services/court_repository.dart';
import '../theme.dart';
import '../widgets/common.dart';

/// Loads a court by slug and builds [builder] with it, or shows a
/// "not found" / error page.
class CourtLoader extends StatefulWidget {
  const CourtLoader({super.key, required this.slug, required this.builder});

  final String slug;
  final Widget Function(BuildContext context, Court court) builder;

  @override
  State<CourtLoader> createState() => _CourtLoaderState();
}

class _CourtLoaderState extends State<CourtLoader> {
  late Future<Court?> _future = CourtRepository.fetchBySlug(widget.slug);

  @override
  void didUpdateWidget(CourtLoader oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.slug != widget.slug) {
      _future = CourtRepository.fetchBySlug(widget.slug);
    }
  }

  void _retry() =>
      setState(() => _future = CourtRepository.fetchBySlug(widget.slug));

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Court?>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(color: AppColors.lime500),
            ),
          );
        }
        if (snap.hasError) {
          return _Message(
            title: 'Fehler beim Laden',
            text: '${snap.error}',
            action: AppButton(label: 'Erneut versuchen', onPressed: _retry),
          );
        }
        final court = snap.data;
        if (court == null) {
          return _Message(
            title: 'Platz nicht gefunden',
            text: 'Es gibt keinen Platz mit dem Kurznamen „${widget.slug}“.',
            action: AppButton(
              label: 'Zur Startseite',
              onPressed: () => context.go('/'),
            ),
          );
        }
        return widget.builder(context, court);
      },
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.title, required this.text, required this.action});
  final String title;
  final String text;
  final Widget action;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(title,
                  style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppColors.gray800)),
              const SizedBox(height: 8),
              Text(text,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 14, color: AppColors.gray500)),
              const SizedBox(height: 24),
              SizedBox(width: 220, child: action),
            ],
          ),
        ),
      ),
    );
  }
}
