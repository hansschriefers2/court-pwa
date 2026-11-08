import 'package:flutter/material.dart';

import '../controllers/trainings_controller.dart';
import '../models/models.dart';
import '../theme.dart';
import '../utils/timeline.dart';
import 'common.dart';

class _FormState {
  _FormState({
    this.id,
    required this.label,
    required this.dayOfWeek,
    required this.start,
    required this.end,
  });

  /// null = create
  final String? id;
  String label;
  int dayOfWeek;
  String start;
  String end;
}

/// List of recurring trainings with inline create/edit form.
class ManageTrainingsSheet extends StatefulWidget {
  const ManageTrainingsSheet({
    super.key,
    required this.controller,
    required this.userId,
    required this.username,
  });

  final TrainingsController controller;
  final String userId;
  final String username;

  @override
  State<ManageTrainingsSheet> createState() => _ManageTrainingsSheetState();
}

class _ManageTrainingsSheetState extends State<ManageTrainingsSheet> {
  _FormState? _form;
  String? _deletingId;
  bool _saving = false;
  String? _error;

  void _openCreate() => setState(() {
        _form = _FormState(
            label: 'Training', dayOfWeek: 1, start: '18:00', end: '20:00');
        _error = null;
      });

  void _openEdit(RecurringTraining t) => setState(() {
        _form = _FormState(
          id: t.id,
          label: t.label,
          dayOfWeek: t.dayOfWeek,
          start: minToTimeStr(t.startMin),
          end: minToTimeStr(t.endMin),
        );
        _error = null;
      });

  Future<void> _save() async {
    final f = _form;
    if (f == null) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    final err = await widget.controller.save(
      id: f.id,
      label: f.label,
      dayOfWeek: f.dayOfWeek,
      startMin: timeStrToMin(f.start),
      endMin: timeStrToMin(f.end),
      userId: widget.userId,
      username: widget.username,
    );
    if (!mounted) return;
    setState(() {
      _saving = false;
      _error = err;
      if (err == null) _form = null;
    });
  }

  Future<void> _delete(String id) async {
    setState(() => _deletingId = id);
    await widget.controller.delete(id);
    if (mounted) setState(() => _deletingId = null);
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.controller,
      builder: (context, _) {
        final sorted = [...widget.controller.trainings]..sort((a, b) {
            final d = a.dayOfWeek.compareTo(b.dayOfWeek);
            return d != 0 ? d : a.startMin.compareTo(b.startMin);
          });
        final form = _form;
        return Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Trainings verwalten',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.gray800,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: 'Schließen',
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close, size: 18, color: AppColors.gray400),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (sorted.isEmpty && form == null)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  'Noch keine Trainings erstellt.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: AppColors.gray400),
                ),
              ),
            for (final t in sorted) ...[
              if (form != null && form.id == t.id)
                _InlineForm(
                  key: ValueKey('edit-${t.id}'),
                  state: form,
                  saving: _saving,
                  error: _error,
                  onChanged: () => setState(() {}),
                  onSave: _save,
                  onCancel: () => setState(() => _form = null),
                )
              else
                _TrainingRow(
                  training: t,
                  deleting: _deletingId == t.id,
                  onEdit: () => _openEdit(t),
                  onDelete: () => _delete(t.id),
                ),
              const SizedBox(height: 12),
            ],
            if (form != null && form.id == null)
              _InlineForm(
                key: const ValueKey('create'),
                state: form,
                saving: _saving,
                error: _error,
                onChanged: () => setState(() {}),
                onSave: _save,
                onCancel: () => setState(() => _form = null),
              )
            else
              OutlinedButton.icon(
                onPressed: _openCreate,
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Neues Training'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.violet600,
                  side: const BorderSide(color: AppColors.violet300),
                  minimumSize: const Size.fromHeight(44),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _TrainingRow extends StatelessWidget {
  const _TrainingRow({
    required this.training,
    required this.deleting,
    required this.onEdit,
    required this.onDelete,
  });

  final RecurringTraining training;
  final bool deleting;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final t = training;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.gray200),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: AppColors.violet100,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              weekdayShortJs[t.dayOfWeek % 7],
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.violet700,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  t.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: AppColors.gray800,
                  ),
                ),
                Text(
                  '${minToTimeStr(t.startMin)} – ${minToTimeStr(t.endMin)}',
                  style: const TextStyle(fontSize: 12, color: AppColors.gray400),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Bearbeiten',
            onPressed: onEdit,
            icon: const Icon(Icons.edit_outlined, size: 18, color: AppColors.gray400),
          ),
          IconButton(
            tooltip: 'Löschen',
            onPressed: deleting ? null : onDelete,
            icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.gray400),
          ),
        ],
      ),
    );
  }
}

class _InlineForm extends StatefulWidget {
  const _InlineForm({
    super.key,
    required this.state,
    required this.saving,
    required this.error,
    required this.onChanged,
    required this.onSave,
    required this.onCancel,
  });

  final _FormState state;
  final bool saving;
  final String? error;
  final VoidCallback onChanged;
  final VoidCallback onSave;
  final VoidCallback onCancel;

  @override
  State<_InlineForm> createState() => _InlineFormState();
}

class _InlineFormState extends State<_InlineForm> {
  late final _label = TextEditingController(text: widget.state.label);

  @override
  void dispose() {
    _label.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.state;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.violet50,
        border: Border.all(color: AppColors.violet200),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _label,
            onChanged: (v) => s.label = v,
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              for (var i = 0; i < 7; i++) ...[
                if (i > 0) const SizedBox(width: 4),
                Expanded(
                  child: Material(
                    color: i == s.dayOfWeek ? AppColors.violet500 : Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(8),
                      onTap: () {
                        s.dayOfWeek = i;
                        widget.onChanged();
                      },
                      child: SizedBox(
                        height: 32,
                        child: Center(
                          child: Text(
                            weekdayShortJs[i],
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: i == s.dayOfWeek
                                  ? Colors.white
                                  : AppColors.gray600,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TimeField(
                  value: s.start,
                  accent: AppColors.violet500,
                  onChanged: (v) {
                    s.start = v;
                    widget.onChanged();
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TimeField(
                  value: s.end,
                  accent: AppColors.violet500,
                  onChanged: (v) {
                    s.end = v;
                    widget.onChanged();
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (widget.error != null) ...[
            Text(widget.error!,
                style: const TextStyle(fontSize: 12, color: AppColors.red600)),
            const SizedBox(height: 8),
          ],
          Row(
            children: [
              Expanded(
                child: AppButton.outline(
                  label: 'Abbrechen',
                  height: 36,
                  onPressed: widget.onCancel,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: AppButton(
                  label: widget.saving ? '…' : 'Speichern',
                  height: 36,
                  background: AppColors.violet500,
                  foreground: Colors.white,
                  onPressed: widget.saving ? null : widget.onSave,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
