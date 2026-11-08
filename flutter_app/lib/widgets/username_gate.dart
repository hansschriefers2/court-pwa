import 'package:flutter/material.dart';

import '../services/user_store.dart';
import '../theme.dart';
import 'common.dart';

/// Shows the "Wie heißt du?" prompt until a username is set, then [builder].
class UsernameGate extends StatelessWidget {
  const UsernameGate({
    super.key,
    required this.courtName,
    required this.builder,
  });

  final String courtName;
  final Widget Function(BuildContext context, String username) builder;

  @override
  Widget build(BuildContext context) {
    final store = UserStore.instance;
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        final name = store.username;
        if (name != null) return builder(context, name);
        return _UsernamePrompt(courtName: courtName);
      },
    );
  }
}

class _UsernamePrompt extends StatefulWidget {
  const _UsernamePrompt({required this.courtName});
  final String courtName;

  @override
  State<_UsernamePrompt> createState() => _UsernamePromptState();
}

class _UsernamePromptState extends State<_UsernamePrompt> {
  final _input = TextEditingController();

  @override
  void initState() {
    super.initState();
    _input.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  void _confirm() {
    if (_input.text.trim().isEmpty) return;
    UserStore.instance.setUsername(_input.text);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.gray100,
      appBar: AppBar(elevation: 0, backgroundColor: AppColors.gray100),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Container(
            width: 320,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: const [
                BoxShadow(color: Colors.black12, blurRadius: 24, offset: Offset(0, 8)),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.asset('assets/icon.png', width: 48, height: 48),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Wie heißt du?',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppColors.gray800,
                  ),
                ),
                const SizedBox(height: 4),
                Text.rich(
                  TextSpan(
                    style: const TextStyle(fontSize: 14, color: AppColors.gray500),
                    children: [
                      const TextSpan(
                          text:
                              'Dein Name erscheint auf deinen Verfügbarkeitsslots auf dem Platz '),
                      TextSpan(
                        text: widget.courtName,
                        style: const TextStyle(
                          fontWeight: FontWeight.w500,
                          color: AppColors.gray700,
                        ),
                      ),
                      const TextSpan(text: '.'),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _input,
                  autofocus: true,
                  textCapitalization: TextCapitalization.words,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _confirm(),
                  decoration: const InputDecoration(hintText: 'Dein Name'),
                ),
                const SizedBox(height: 16),
                AppButton(
                  label: 'Weiter',
                  onPressed: _input.text.trim().isEmpty ? null : _confirm,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
