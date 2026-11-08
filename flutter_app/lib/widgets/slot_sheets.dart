import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/models.dart';
import '../services/court_repository.dart' show db;
import '../theme.dart';
import '../utils/timeline.dart';
import 'common.dart';

const _titleStyle = TextStyle(
  fontSize: 16,
  fontWeight: FontWeight.w600,
  color: AppColors.gray800,
);

// ─── Add / edit slot ─────────────────────────────────────────────────────────

class AddSlotSheet extends StatefulWidget {
  const AddSlotSheet({
    super.key,
    required this.court,
    required this.username,
    required this.userId,
    required this.date,
    this.editSlot,
    this.copyFrom,
  });

  final Court court;
  final String username;
  final String userId;
  final DateTime date;
  final TimeSlot? editSlot;
  final TimeSlot? copyFrom;

  @override
  State<AddSlotSheet> createState() => _AddSlotSheetState();
}

String _pushEndTime(String time, int minutes) =>
    minToTimeStr(math.min(timeStrToMin(time) + minutes, 23 * 60 + 59));

class _AddSlotSheetState extends State<AddSlotSheet> {
  late String _start;
  late String _end;
  late final TextEditingController _name;
  late SlotStatus _status;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final source = widget.editSlot ?? widget.copyFrom;
    _start = source != null ? minToTimeStr(source.startMin) : defaultStartTime();
    _end = source != null
        ? minToTimeStr(source.endMin)
        : _pushEndTime(defaultStartTime(), 60);
    _name = TextEditingController(
      text: widget.editSlot?.name ?? widget.username,
    );
    _status = widget.editSlot?.status ?? SlotStatus.accepted;
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  void _setStart(String value) {
    setState(() {
      _start = value;
      if (timeStrToMin(_end) <= timeStrToMin(value)) {
        _end = _pushEndTime(value, 60);
      }
    });
  }

  Future<void> _submit() async {
    final startMin = timeStrToMin(_start);
    final endMin = timeStrToMin(_end);
    if (endMin <= startMin) {
      setState(() => _error = 'Das Ende muss nach dem Start liegen.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });

    final edit = widget.editSlot;
    final name = _name.text.trim().isNotEmpty
        ? _name.text.trim()
        : (edit?.name ?? widget.username);
    try {
      if (edit != null) {
        await db.from('slots').update({
          'start_min': startMin,
          'end_min': endMin,
          'user_name': name,
          'status': _status.name,
        }).eq('id', edit.id);
      } else {
        await db.from('slots').insert({
          'court_id': widget.court.id,
          'user_name': name,
          'user_id': widget.userId,
          'date': localDateStr(widget.date),
          'start_min': startMin,
          'end_min': endMin,
          'status': _status.name,
        });
      }
    } on PostgrestException catch (e) {
      if (mounted) setState(() {
        _error = e.message;
        _saving = false;
      });
      return;
    } catch (e) {
      if (mounted) setState(() {
        _error = e.toString();
        _saving = false;
      });
      return;
    }
    if (mounted) Navigator.of(context).pop(true);
  }

  Widget _statusButton(
    SlotStatus value,
    String label,
    Color activeBg,
    Color activeFg, {
    bool divider = true,
  }) {
    final active = _status == value;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _status = value),
        child: Container(
          height: 38,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: active ? activeBg : Colors.white,
            border: divider
                ? const Border(left: BorderSide(color: AppColors.gray300))
                : null,
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: active ? activeFg : AppColors.gray600,
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final editing = widget.editSlot != null;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(editing ? 'Slot bearbeiten' : 'Neuer Slot',
                  style: _titleStyle),
            ),
            Text(
              formatDateLabel(widget.date),
              style: const TextStyle(fontSize: 14, color: AppColors.gray400),
            ),
          ],
        ),
        const SizedBox(height: 20),
        const FieldLabel('Name'),
        TextField(controller: _name, textCapitalization: TextCapitalization.words),
        const SizedBox(height: 16),
        const FieldLabel('Zusage'),
        Container(
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.gray300),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              _statusButton(SlotStatus.accepted, 'Sicher', AppColors.lime400,
                  AppColors.gray900,
                  divider: false),
              _statusButton(SlotStatus.tentative, 'Vielleicht',
                  AppColors.amber100, AppColors.amber800),
              _statusButton(SlotStatus.declined, 'Nicht dabei',
                  AppColors.red100, AppColors.red700),
            ],
          ),
        ),
        const SizedBox(height: 16),
        const FieldLabel('Start'),
        TimeField(value: _start, onChanged: _setStart),
        const SizedBox(height: 16),
        const FieldLabel('Ende'),
        TimeField(value: _end, onChanged: (v) => setState(() => _end = v)),
        const SizedBox(height: 20),
        if (_error != null) ...[ErrorBox(_error!), const SizedBox(height: 16)],
        Row(
          children: [
            Expanded(
              child: AppButton.outline(
                label: 'Abbrechen',
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: AppButton(
                label: _saving ? 'Speichern…' : 'Speichern',
                onPressed: _saving ? null : _submit,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

// ─── Own slot: edit / delete ─────────────────────────────────────────────────

enum SlotAction { edit, delete }

class SlotActionSheet extends StatelessWidget {
  const SlotActionSheet({super.key, required this.slot});
  final TimeSlot slot;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(slot.name, style: _titleStyle),
        const SizedBox(height: 4),
        Text(
          '${minToTimeStr(slot.startMin)} – ${minToTimeStr(slot.endMin)}',
          style: const TextStyle(fontSize: 14, color: AppColors.gray500),
        ),
        const SizedBox(height: 20),
        AppButton(
          label: 'Bearbeiten',
          onPressed: () => Navigator.of(context).pop(SlotAction.edit),
        ),
        const SizedBox(height: 8),
        AppButton(
          label: 'Löschen',
          background: AppColors.red600,
          foreground: Colors.white,
          onPressed: () => Navigator.of(context).pop(SlotAction.delete),
        ),
        const SizedBox(height: 8),
        AppButton.outline(
          label: 'Abbrechen',
          onPressed: () => Navigator.of(context).pop(),
        ),
      ],
    );
  }
}

// ─── Respond to a training ───────────────────────────────────────────────────

class TrainingResponseSheet extends StatefulWidget {
  const TrainingResponseSheet({
    super.key,
    required this.training,
    required this.date,
    required this.userId,
    required this.username,
  });

  final RecurringTraining training;
  final DateTime date;
  final String userId;
  final String username;

  @override
  State<TrainingResponseSheet> createState() => _TrainingResponseSheetState();
}

class _TrainingResponseSheetState extends State<TrainingResponseSheet> {
  bool _saving = false;
  String? _error;

  Future<void> _respond(SlotStatus status) async {
    setState(() {
      _saving = true;
      _error = null;
    });
    final t = widget.training;
    try {
      await db.from('slots').insert({
        'court_id': t.courtId,
        'user_name': widget.username,
        'user_id': widget.userId,
        'date': localDateStr(widget.date),
        'start_min': t.startMin,
        'end_min': t.endMin,
        'status': status.name,
        'training_id': t.id,
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e is PostgrestException ? e.message : e.toString();
          _saving = false;
        });
      }
      return;
    }
    if (mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.training;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: const BoxDecoration(
                color: AppColors.violet500,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(t.label, style: _titleStyle)),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          '${minToTimeStr(t.startMin)} – ${minToTimeStr(t.endMin)} · Wöchentlich',
          style: const TextStyle(fontSize: 14, color: AppColors.gray500),
        ),
        const SizedBox(height: 20),
        if (_error != null) ...[
          Text(_error!,
              style: const TextStyle(fontSize: 14, color: AppColors.red600)),
          const SizedBox(height: 12),
        ],
        AppButton(
          label: 'Ich bin dabei',
          height: 44,
          onPressed: _saving ? null : () => _respond(SlotStatus.accepted),
        ),
        const SizedBox(height: 8),
        AppButton(
          label: 'Vielleicht',
          height: 44,
          background: AppColors.amber100,
          foreground: AppColors.amber800,
          onPressed: _saving ? null : () => _respond(SlotStatus.tentative),
        ),
        const SizedBox(height: 8),
        AppButton(
          label: 'Nicht dabei',
          height: 44,
          background: AppColors.red50,
          foreground: AppColors.red700,
          onPressed: _saving ? null : () => _respond(SlotStatus.declined),
        ),
        const SizedBox(height: 8),
        AppButton(
          label: 'Abbrechen',
          height: 44,
          background: Colors.white,
          foreground: AppColors.gray400,
          onPressed: () => Navigator.of(context).pop(),
        ),
      ],
    );
  }
}
