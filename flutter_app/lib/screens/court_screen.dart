import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config.dart';
import '../controllers/notifications_controller.dart';
import '../controllers/slots_controller.dart';
import '../controllers/trainings_controller.dart';
import '../models/models.dart';
import '../services/user_store.dart';
import '../theme.dart';
import '../utils/timeline.dart';
import '../widgets/common.dart';
import '../widgets/court_scheduler.dart';
import '../widgets/manage_trainings_sheet.dart';
import '../widgets/slot_sheets.dart';

enum _MenuItem { pinboard, share, trainings, faq }

class CourtScreen extends StatefulWidget {
  const CourtScreen({super.key, required this.court, required this.username});

  final Court court;
  final String username;

  @override
  State<CourtScreen> createState() => _CourtScreenState();
}

class _CourtScreenState extends State<CourtScreen> with WidgetsBindingObserver {
  late final SlotsController _slots;
  late final TrainingsController _trainings;
  late final UtilizationController _utilization;
  late final CourtNotificationsController _notify;
  late final Listenable _all;

  Court get court => widget.court;
  String get userId => UserStore.instance.userId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _slots = SlotsController(court.id)..start();
    _trainings = TrainingsController(court.id)..start();
    _utilization = UtilizationController(court.id)..fetch();
    _notify = CourtNotificationsController(courtId: court.id, userId: userId)
      ..init();
    _all = Listenable.merge([_slots, _trainings, _utilization, _notify]);
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => UserStore.instance.addRecentCourt(court.slug, court.name),
    );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _slots.dispose();
    _trainings.dispose();
    _utilization.dispose();
    _notify.dispose();
    super.dispose();
  }

  // Re-fetch when the app comes back to the foreground (notification tap,
  // app switch) – Realtime events may have been missed meanwhile.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _slots.refresh();
      _utilization.fetch();
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  Future<void> _openAddSlot({TimeSlot? copyFrom, TimeSlot? editSlot}) async {
    final saved = await showAppSheet<bool>(
      context,
      (_) => AddSlotSheet(
        court: court,
        username: widget.username,
        userId: userId,
        date: _slots.currentDate,
        copyFrom: copyFrom,
        editSlot: editSlot,
      ),
    );
    if (saved == true) _utilization.fetch();
  }

  Future<void> _openSlotActions(TimeSlot slot) async {
    final action = await showAppSheet<SlotAction>(
      context,
      (_) => SlotActionSheet(slot: slot),
    );
    if (!mounted) return;
    switch (action) {
      case SlotAction.edit:
        await _openAddSlot(editSlot: slot);
      case SlotAction.delete:
        await _slots.deleteSlot(slot.id);
        _utilization.fetch();
      case null:
        break;
    }
  }

  Future<void> _onTrainingTap(RecurringTraining training) async {
    final existing = _slots.slots
        .where((s) => s.trainingId == training.id && s.userId == userId)
        .firstOrNull;
    if (existing != null) {
      await _openSlotActions(existing);
      return;
    }
    final saved = await showAppSheet<bool>(
      context,
      (_) => TrainingResponseSheet(
        training: training,
        date: _slots.currentDate,
        userId: userId,
        username: widget.username,
      ),
    );
    if (saved == true) _utilization.fetch();
  }

  void _openTrainings() {
    showAppSheet<void>(
      context,
      (_) => ManageTrainingsSheet(
        controller: _trainings,
        userId: userId,
        username: widget.username,
      ),
    );
  }

  void _share() {
    final base = Config.webBaseUrl.replaceAll(RegExp(r'/+$'), '');
    final link = base.isEmpty
        ? 'Kurzname in der Court-App: ${court.slug}'
        : '$base/${court.slug}';
    SharePlus.instance.share(
      ShareParams(
        subject: court.name,
        text: 'Komm zu ${court.name} auf Court: $link',
      ),
    );
  }

  void _onMenu(_MenuItem item) {
    switch (item) {
      case _MenuItem.pinboard:
        context.push('/${court.slug}/pinnwand');
      case _MenuItem.share:
        _share();
      case _MenuItem.trainings:
        _openTrainings();
      case _MenuItem.faq:
        context.push('/faq');
    }
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _all,
      builder: (context, _) {
        final date = _slots.currentDate;
        final dailyTrainings = _trainings.trainings
            .where((t) => t.dayOfWeek == jsWeekday(date))
            .toList();
        return Scaffold(
          appBar: AppBar(
            leading: IconButton(
              tooltip: 'Zurück zur Übersicht',
              icon: const Icon(Icons.chevron_left, color: AppColors.gray500),
              onPressed: () =>
                  context.canPop() ? context.pop() : context.go('/'),
            ),
            titleSpacing: 0,
            title: Text(court.name, overflow: TextOverflow.ellipsis),
            actions: [
              if (_notify.isSupported) _bellButton(),
              PopupMenuButton<_MenuItem>(
                tooltip: 'Menü',
                icon: const Icon(Icons.more_vert, color: AppColors.gray400),
                color: Colors.white,
                surfaceTintColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
                onSelected: _onMenu,
                itemBuilder: (_) => [
                  _menuEntry(_MenuItem.pinboard, Icons.chat_bubble_outline,
                      'Pinnwand'),
                  _menuEntry(_MenuItem.share, Icons.share_outlined, 'Teilen'),
                  const PopupMenuDivider(),
                  _menuEntry(_MenuItem.trainings, Icons.format_list_bulleted,
                      'Trainings verwalten',
                      iconColor: AppColors.violet600),
                  const PopupMenuDivider(),
                  _menuEntry(_MenuItem.faq, Icons.help_outline, 'FAQ & Hilfe'),
                ],
              ),
            ],
          ),
          body: Column(
            children: [
              if (court.description != null || court.mapsUrl != null)
                _infoStrip(),
              if (_notify.initialized &&
                  !_notify.subscribed &&
                  _notify.isSupported)
                _notifyBanner(),
              if (_slots.error != null)
                Container(
                  width: double.infinity,
                  color: AppColors.red50,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Text(
                    'Fehler beim Laden: ${_slots.error}',
                    style:
                        const TextStyle(fontSize: 14, color: AppColors.red700),
                  ),
                ),
              Expanded(
                child: CourtScheduler(
                  selectedDate: date,
                  slots: _slots.slots,
                  loading: _slots.loading,
                  userId: userId,
                  minPeople: court.minPeople,
                  utilizationByDate: _utilization.byDate,
                  trainings: dailyTrainings,
                  onDateChange: _slots.changeDate,
                  onAddSlot: () => _openAddSlot(),
                  onSlotTap: _openSlotActions,
                  onForeignSlotTap: (s) => _openAddSlot(copyFrom: s),
                  onTrainingTap: _onTrainingTap,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  PopupMenuItem<_MenuItem> _menuEntry(
    _MenuItem value,
    IconData icon,
    String label, {
    Color iconColor = AppColors.gray400,
  }) =>
      PopupMenuItem(
        value: value,
        child: Row(
          children: [
            Icon(icon, size: 18, color: iconColor),
            const SizedBox(width: 12),
            Text(label,
                style: const TextStyle(fontSize: 14, color: AppColors.gray700)),
          ],
        ),
      );

  Widget _bellButton() {
    final subscribed = _notify.subscribed;
    final denied = _notify.denied;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 2),
      child: IconButton(
        tooltip: denied
            ? 'Benachrichtigungen sind blockiert – bitte in den Systemeinstellungen erlauben'
            : subscribed
                ? 'Benachrichtigungen deaktivieren'
                : 'Bei neuen Slots benachrichtigt werden',
        style: IconButton.styleFrom(
          backgroundColor: subscribed ? AppColors.lime400 : null,
        ),
        onPressed: _notify.loading || (denied && !subscribed)
            ? null
            : _notify.toggle,
        icon: Icon(
          subscribed
              ? Icons.notifications
              : Icons.notifications_none_outlined,
          color: denied
              ? AppColors.gray300
              : subscribed
                  ? AppColors.gray900
                  : AppColors.gray400,
        ),
      ),
    );
  }

  Widget _infoStrip() {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: AppColors.gray50,
        border: Border(bottom: BorderSide(color: AppColors.gray100)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: court.description != null
                ? Text(
                    court.description!,
                    style: const TextStyle(
                        fontSize: 12, height: 1.5, color: AppColors.gray400),
                  )
                : const SizedBox.shrink(),
          ),
          if (court.mapsUrl != null) ...[
            const SizedBox(width: 8),
            OutlinedButton.icon(
              onPressed: () => launchUrl(
                Uri.parse(court.mapsUrl!),
                mode: LaunchMode.externalApplication,
              ),
              icon: const Icon(Icons.place_outlined,
                  size: 14, color: AppColors.red500),
              label: const Text('Maps'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.gray600,
                backgroundColor: Colors.white,
                side: const BorderSide(color: AppColors.gray200),
                visualDensity: VisualDensity.compact,
                padding: const EdgeInsets.symmetric(horizontal: 10),
                textStyle:
                    const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                shape: const StadiumBorder(),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _notifyBanner() {
    final denied = _notify.denied;
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: AppColors.lime50,
        border: Border(bottom: BorderSide(color: AppColors.lime200)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: denied ? AppColors.red500 : AppColors.lime500,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  denied
                      ? 'Benachrichtigungen sind blockiert'
                      : 'Benachrichtigungen sind ausgeschaltet',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.gray900,
                  ),
                ),
                Text(
                  denied
                      ? 'Bitte in den Systemeinstellungen für Court erlauben.'
                      : 'Tippe oben auf die Glocke, um sie zu aktivieren.',
                  style:
                      const TextStyle(fontSize: 12, color: AppColors.gray600),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
