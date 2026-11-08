import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../services/court_repository.dart';
import '../services/user_store.dart';
import '../theme.dart';
import '../widgets/common.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _join = TextEditingController();
  final _name = TextEditingController();
  final _desc = TextEditingController();
  final _maps = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    for (final c in [_join, _name]) {
      c.addListener(() => setState(() {}));
    }
  }

  @override
  void dispose() {
    _join.dispose();
    _name.dispose();
    _desc.dispose();
    _maps.dispose();
    super.dispose();
  }

  void _openJoin() {
    final slug = _join.text.trim().toLowerCase();
    if (slug.isEmpty) return;
    context.push('/$slug');
  }

  Future<void> _create() async {
    if (_name.text.trim().isEmpty || _saving) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final slug = await CourtRepository.create(
        _name.text,
        description: _desc.text,
        mapsUrl: _maps.text,
      );
      if (!mounted) return;
      setState(() => _saving = false);
      _name.clear();
      _desc.clear();
      _maps.clear();
      context.push('/$slug');
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 32, 16, 16),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 384),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: const [
                          BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, 2)),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Image.asset('assets/icon.png', width: 72, height: 72),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const _RecentCourts(),
                  _card(
                    title: 'Bestehenden Platz öffnen',
                    subtitle: 'Gib den Kurznamen des Platzes ein.',
                    children: [
                      TextField(
                        controller: _join,
                        autocorrect: false,
                        textInputAction: TextInputAction.go,
                        onSubmitted: (_) => _openJoin(),
                        decoration: const InputDecoration(
                            hintText: 'z. B. stadtpark-platz-1'),
                      ),
                      const SizedBox(height: 12),
                      AppButton(
                        label: 'Öffnen',
                        onPressed: _join.text.trim().isEmpty ? null : _openJoin,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _card(
                    title: 'Neuen Platz anlegen',
                    subtitle: 'Gib deinem Platz einen Namen.',
                    children: [
                      TextField(
                        controller: _name,
                        textCapitalization: TextCapitalization.words,
                        onChanged: (_) {
                          if (_error != null) setState(() => _error = null);
                        },
                        decoration: const InputDecoration(
                            hintText: 'z. B. Stadtpark Platz 1'),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _desc,
                        maxLength: 400,
                        minLines: 2,
                        maxLines: 4,
                        decoration: const InputDecoration(
                          hintText: 'Kurzbeschreibung (optional, max. 400 Zeichen)',
                          counterText: '',
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _maps,
                        keyboardType: TextInputType.url,
                        autocorrect: false,
                        decoration: const InputDecoration(
                            hintText: 'Google Maps Link (optional)'),
                      ),
                      const SizedBox(height: 12),
                      if (_error != null) ...[
                        ErrorBox(_error!),
                        const SizedBox(height: 12),
                      ],
                      AppButton(
                        label: _saving ? 'Erstellen…' : 'Platz erstellen',
                        onPressed: _name.text.trim().isEmpty || _saving
                            ? null
                            : _create,
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _footerLink('Impressum', '/impressum'),
                      _footerLink('Datenschutz', '/datenschutz'),
                      _footerLink('FAQ', '/faq'),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _footerLink(String label, String path) => TextButton(
        onPressed: () => context.push(path),
        style: TextButton.styleFrom(foregroundColor: AppColors.gray400),
        child: Text(label, style: const TextStyle(fontSize: 12)),
      );

  Widget _card({
    required String title,
    required String subtitle,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 24, offset: Offset(0, 8)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(title,
              style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.gray800)),
          const SizedBox(height: 4),
          Text(subtitle,
              style: const TextStyle(fontSize: 14, color: AppColors.gray500)),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }
}

class _RecentCourts extends StatelessWidget {
  const _RecentCourts();

  @override
  Widget build(BuildContext context) {
    final store = UserStore.instance;
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        final courts = store.recentCourts;
        if (courts.isEmpty) return const SizedBox.shrink();
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Padding(
                padding: EdgeInsets.only(bottom: 8),
                child: Text(
                  'ZULETZT BESUCHT',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.5,
                    color: AppColors.gray400,
                  ),
                ),
              ),
              for (final c in courts)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      Expanded(
                        child: Material(
                          color: Colors.white,
                          elevation: 1,
                          borderRadius: BorderRadius.circular(12),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(12),
                            onTap: () => context.push('/${c.slug}'),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 10),
                              child: Row(
                                children: [
                                  const Icon(Icons.schedule,
                                      size: 16, color: AppColors.lime500),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      c.name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                        color: AppColors.gray800,
                                      ),
                                    ),
                                  ),
                                  const Icon(Icons.chevron_right,
                                      size: 18, color: AppColors.gray300),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 4),
                      IconButton(
                        tooltip: '${c.name} entfernen',
                        onPressed: () => store.removeRecentCourt(c.slug),
                        icon: const Icon(Icons.close,
                            size: 18, color: AppColors.gray400),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
