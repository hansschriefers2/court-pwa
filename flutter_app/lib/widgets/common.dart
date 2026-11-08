import 'package:flutter/material.dart';

import '../theme.dart';
import '../utils/timeline.dart';

/// Rounded, flat button in the style of the web version.
class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.background = AppColors.lime400,
    this.foreground = AppColors.gray900,
    this.border,
    this.height = 40,
  });

  final String label;
  final VoidCallback? onPressed;
  final Color background;
  final Color foreground;
  final Color? border;
  final double height;

  const AppButton.outline({
    super.key,
    required this.label,
    required this.onPressed,
    this.height = 40,
  })  : background = Colors.white,
        foreground = AppColors.gray700,
        border = AppColors.gray300;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null;
    return Opacity(
      opacity: enabled ? 1 : 0.4,
      child: SizedBox(
        height: height,
        width: double.infinity,
        child: TextButton(
          onPressed: onPressed,
          style: TextButton.styleFrom(
            backgroundColor: background,
            foregroundColor: foreground,
            disabledBackgroundColor: background,
            disabledForegroundColor: foreground,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
              side: border == null
                  ? BorderSide.none
                  : BorderSide(color: border!),
            ),
            textStyle:
                const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
          ),
          child: Text(label),
        ),
      ),
    );
  }
}

class ErrorBox extends StatelessWidget {
  const ErrorBox(this.message, {super.key});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.red50,
        border: Border.all(color: AppColors.red200),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        message,
        style: const TextStyle(fontSize: 14, color: AppColors.red600),
      ),
    );
  }
}

class FieldLabel extends StatelessWidget {
  const FieldLabel(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: AppColors.gray500,
          ),
        ),
      );
}

/// Tappable "HH:MM" field that opens a 24h time picker.
class TimeField extends StatelessWidget {
  const TimeField({
    super.key,
    required this.value,
    required this.onChanged,
    this.accent = AppColors.lime400,
  });

  final String value;
  final ValueChanged<String> onChanged;
  final Color accent;

  Future<void> _pick(BuildContext context) async {
    final minutes = timeStrToMin(value);
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: minutes ~/ 60, minute: minutes % 60),
      initialEntryMode: TimePickerEntryMode.input,
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (picked != null) {
      onChanged(minToTimeStr(picked.hour * 60 + picked.minute));
    }
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: () => _pick(context),
      child: Container(
        height: 42,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: AppColors.gray300),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                value,
                style: const TextStyle(fontSize: 14, color: AppColors.gray900),
              ),
            ),
            Icon(Icons.schedule, size: 18, color: accent),
          ],
        ),
      ),
    );
  }
}

/// Wraps bottom-sheet content: white card, padding, keyboard inset.
class SheetFrame extends StatelessWidget {
  const SheetFrame({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final insets = MediaQuery.of(context).viewInsets.bottom;
    final safe = MediaQuery.of(context).padding.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: insets),
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(24, 24, 24, 24 + safe),
        child: child,
      ),
    );
  }
}

Future<T?> showAppSheet<T>(BuildContext context, WidgetBuilder builder) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.white,
    builder: (ctx) => SheetFrame(child: builder(ctx)),
  );
}

class UtilDot extends StatelessWidget {
  const UtilDot({super.key, required this.count, required this.minPeople});
  final int count;
  final int minPeople;

  @override
  Widget build(BuildContext context) {
    if (count == 0) return const SizedBox(height: 4);
    final opacity = (count / (minPeople <= 0 ? 1 : minPeople)).clamp(0.0, 1.0).toDouble();
    return Container(
      width: 4,
      height: 4,
      decoration: BoxDecoration(
        color: AppColors.lime500.withValues(alpha: opacity),
        shape: BoxShape.circle,
      ),
    );
  }
}
