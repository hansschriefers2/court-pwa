import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../controllers/pinboard_controller.dart';
import '../models/models.dart';
import '../services/user_store.dart';
import '../theme.dart';

String _formatDate(DateTime d) {
  String p(int n) => n.toString().padLeft(2, '0');
  final yy = p(d.year % 100);
  return '${p(d.day)}.${p(d.month)}.$yy, ${p(d.hour)}:${p(d.minute)}';
}

class PinboardScreen extends StatefulWidget {
  const PinboardScreen({super.key, required this.court, required this.username});

  final Court court;
  final String username;

  @override
  State<PinboardScreen> createState() => _PinboardScreenState();
}

class _PinboardScreenState extends State<PinboardScreen> {
  late final PinboardController _board;
  final _text = TextEditingController();
  final _focus = FocusNode();
  final _scroll = ScrollController();
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _board = PinboardController(widget.court.id)..start();
    _text.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _board.dispose();
    _text.dispose();
    _focus.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final trimmed = _text.text.trim();
    if (trimmed.isEmpty || _submitting) return;
    setState(() => _submitting = true);
    final ok = await _board.add(
      trimmed,
      widget.username,
      UserStore.instance.userId,
    );
    if (!mounted) return;
    setState(() => _submitting = false);
    if (ok) {
      _text.clear();
      _focus.unfocus();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nachricht konnte nicht gesendet werden.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final court = widget.court;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: 'Zurück zum Court',
          icon: const Icon(Icons.chevron_left, color: AppColors.gray500),
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/${court.slug}'),
        ),
        titleSpacing: 0,
        title: Text('Pinnwand · ${court.name}', overflow: TextOverflow.ellipsis),
      ),
      body: Column(
        children: [
          Expanded(
            child: ColoredBox(
              color: AppColors.green50,
              child: ListenableBuilder(
                listenable: _board,
                builder: (context, _) {
                  if (_board.loading && _board.messages.isEmpty) {
                    return Center(
                      child: Text('Laden…',
                          style: TextStyle(
                              fontSize: 14,
                              color: AppColors.lime900.withValues(alpha: 0.5))),
                    );
                  }
                  if (_board.messages.isEmpty) {
                    return Center(
                      child: Text(
                        'Noch keine Nachrichten. Sei der Erste!',
                        style: TextStyle(
                            fontSize: 14,
                            color: AppColors.lime900.withValues(alpha: 0.6)),
                      ),
                    );
                  }
                  return RefreshIndicator(
                    color: AppColors.lime500,
                    onRefresh: _board.fetch,
                    child: ListView.separated(
                      controller: _scroll,
                      padding: const EdgeInsets.fromLTRB(12, 16, 12, 16),
                      itemCount: _board.messages.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, i) {
                        final msg = _board.messages[i];
                        return _NoteCard(
                          msg: msg,
                          onDelete: () => _board.delete(msg.id),
                        );
                      },
                    ),
                  );
                },
              ),
            ),
          ),
          _composeBar(context),
        ],
      ),
    );
  }

  Widget _composeBar(BuildContext context) {
    final canSend = _text.text.trim().isNotEmpty && !_submitting;
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.gray100)),
      ),
      padding: EdgeInsets.fromLTRB(
        12,
        8,
        12,
        8 + MediaQuery.of(context).padding.bottom,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: TextField(
              controller: _text,
              focusNode: _focus,
              maxLength: 200,
              minLines: 1,
              maxLines: 5,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(
                hintText: 'Nachricht hinterlassen…',
                counterText: '',
                fillColor: AppColors.gray50,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide: const BorderSide(color: AppColors.gray200),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide:
                      const BorderSide(color: AppColors.lime400, width: 2),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Opacity(
            opacity: canSend ? 1 : 0.4,
            child: Material(
              color: AppColors.lime400,
              shape: const CircleBorder(),
              elevation: 1,
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: canSend ? _submit : null,
                child: const SizedBox(
                  width: 40,
                  height: 40,
                  child: Icon(Icons.send_rounded,
                      size: 18,
                      color: AppColors.gray900,
                      semanticLabel: 'Anheften'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NoteCard extends StatelessWidget {
  const _NoteCard({required this.msg, required this.onDelete});

  final PinboardMessage msg;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
      decoration: BoxDecoration(
        color: AppColors.yellow100,
        border: const Border(
          bottom: BorderSide(color: AppColors.yellow300, width: 3),
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x2E000000),
            blurRadius: 12,
            offset: Offset(2, 4),
          ),
        ],
      ),
      child: Stack(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 4, right: 20),
                child: Text(
                  msg.message,
                  style: const TextStyle(
                    fontSize: 14,
                    height: 1.375,
                    color: AppColors.gray800,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Flexible(
                    child: Text(
                      msg.username,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.gray600,
                      ),
                    ),
                  ),
                  const Text(' · ',
                      style: TextStyle(fontSize: 12, color: AppColors.gray300)),
                  Text(
                    _formatDate(msg.createdAt),
                    style:
                        const TextStyle(fontSize: 12, color: AppColors.gray400),
                  ),
                ],
              ),
            ],
          ),
          Positioned(
            top: -6,
            right: -6,
            child: IconButton(
              tooltip: 'Nachricht entfernen',
              visualDensity: VisualDensity.compact,
              onPressed: onDelete,
              icon: const Icon(Icons.close, size: 14, color: AppColors.gray400),
            ),
          ),
        ],
      ),
    );
  }
}
