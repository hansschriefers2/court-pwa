import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/push_service.dart';
import '../services/user_store.dart';
import '../theme.dart';

/// Shared layout for FAQ / Impressum / Datenschutz.
class _InfoPage extends StatelessWidget {
  const _InfoPage({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: 'Zurück',
          icon: const Icon(Icons.chevron_left, color: AppColors.gray500),
          onPressed: () => context.canPop() ? context.pop() : context.go('/'),
        ),
        titleSpacing: 0,
        title: Text(title),
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 640),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: const [
                    BoxShadow(
                        color: Colors.black12,
                        blurRadius: 24,
                        offset: Offset(0, 8)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: children,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Small typography helpers ────────────────────────────────────────────────

Widget _h1(String t) => Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(t,
          style: const TextStyle(
              fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.gray900)),
    );

Widget _h2(String t) => Padding(
      padding: const EdgeInsets.only(top: 16, bottom: 6),
      child: Text(t,
          style: const TextStyle(
              fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.gray900)),
    );

Widget _h3(String t) => Padding(
      padding: const EdgeInsets.only(top: 10, bottom: 4),
      child: Text(t,
          style: const TextStyle(
              fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.gray800)),
    );

const _body = TextStyle(fontSize: 14, height: 1.55, color: AppColors.gray600);

Widget _p(String t) => Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(t, style: _body),
    );

/// Paragraph with **bold** segments.
Widget _rich(String t) {
  final spans = <TextSpan>[];
  final parts = t.split('**');
  for (var i = 0; i < parts.length; i++) {
    spans.add(TextSpan(
      text: parts[i],
      style: i.isOdd
          ? const TextStyle(fontWeight: FontWeight.w600, color: AppColors.gray800)
          : null,
    ));
  }
  return Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Text.rich(TextSpan(style: _body, children: spans)),
  );
}

Widget _bullets(List<String> items) => Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final item in items)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('•  ', style: _body),
                  Expanded(child: _rich(item)),
                ],
              ),
            ),
        ],
      ),
    );

// ─── FAQ ─────────────────────────────────────────────────────────────────────

const _faqs = <(String, String)>[
  (
    'Was ist Court?',
    'Court ist eine einfache App, mit der du und deine Gruppe Verfügbarkeiten für euren Platz eintragen und auf einen Blick sehen könnt, wer wann Zeit hat – ganz ohne Registrierung.',
  ),
  (
    'Muss ich ein Konto anlegen?',
    'Nein. Du wählst beim ersten Öffnen eines Courts nur einen Benutzernamen, der lokal auf deinem Gerät gespeichert wird. Es gibt keine Registrierung, kein Passwort und keine E-Mail-Adresse.',
  ),
  (
    'Wie teile ich meinen Court mit anderen?',
    'Tippe im Court auf das Menü (⋮) und dann auf „Teilen“. Wer den Kurznamen oder Link kennt, kann die eingetragenen Slots sehen und eigene hinzufügen.',
  ),
  (
    'Wie trage ich einen Slot ein?',
    'Öffne deinen Court und tippe auf den „+“-Button im Zeitplan. Wähle Start- und Endzeit und speichere den Slot. Tippst du auf den Slot einer anderen Person, wird ihre Zeit als Vorlage übernommen.',
  ),
  (
    'Kann ich einen Slot wieder löschen?',
    'Ja. Tippe auf einen deiner eigenen Slots im Zeitplan – dort erscheint ein Menü mit der Option zum Löschen oder Bearbeiten.',
  ),
  (
    'Wie aktiviere ich Benachrichtigungen?',
    'Tippe im Court auf das Glocken-Symbol in der oberen Leiste und erlaube Benachrichtigungen. Du wirst dann informiert, wenn jemand einen neuen Slot einträgt, genug Leute gleichzeitig Zeit haben oder eine Nachricht auf der Pinnwand landet. Benachrichtigungen gelten jeweils pro Court.',
  ),
  (
    'Ich bekomme keine Benachrichtigungen – was tun?',
    'Prüfe in den Systemeinstellungen deines Geräts, ob Benachrichtigungen für Court erlaubt sind. Danach im Court die Glocke einmal aus- und wieder einschalten.',
  ),
  (
    'Wie kann ich meinen Benutzernamen ändern?',
    'Der Benutzername wird beim ersten Öffnen eines Courts festgelegt und lokal gespeichert. Du kannst ihn unten über „App-Daten löschen“ zurücksetzen; beim nächsten Öffnen eines Courts wirst du erneut nach deinem Namen gefragt.',
  ),
  (
    'Welche Daten werden gespeichert?',
    'Nur dein selbst gewählter Benutzername, die von dir eingetragenen Zeitfenster sowie – wenn du Benachrichtigungen aktivierst – ein anonymer Push-Token. Keine E-Mail, kein Klarname, kein Passwort. Details findest du in der Datenschutzerklärung.',
  ),
];

class FaqScreen extends StatelessWidget {
  const FaqScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _InfoPage(
      title: 'FAQ',
      children: [
        _h1('Häufige Fragen (FAQ)'),
        Theme(
          data: Theme.of(context).copyWith(dividerColor: AppColors.gray100),
          child: Column(
            children: [
              for (final (q, a) in _faqs)
                ExpansionTile(
                  tilePadding: EdgeInsets.zero,
                  childrenPadding: const EdgeInsets.only(bottom: 16),
                  expandedAlignment: Alignment.centerLeft,
                  iconColor: AppColors.gray400,
                  collapsedIconColor: AppColors.gray400,
                  title: Text(q,
                      style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.gray900)),
                  children: [Text(a, style: _body)],
                ),
            ],
          ),
        ),
        const Divider(height: 48, color: AppColors.gray100),
        const Text(
          'Benutzernamen, Geräte-ID und zuletzt besuchte Plätze von diesem Gerät entfernen:',
          style: TextStyle(fontSize: 14, color: AppColors.gray500),
        ),
        const SizedBox(height: 12),
        const _ClearDataButton(),
      ],
    );
  }
}

class _ClearDataButton extends StatefulWidget {
  const _ClearDataButton();

  @override
  State<_ClearDataButton> createState() => _ClearDataButtonState();
}

class _ClearDataButtonState extends State<_ClearDataButton> {
  bool _done = false;

  Future<void> _clear() async {
    try {
      await PushService.instance.unsubscribeAll();
    } catch (_) {
      // Not critical – the token simply stays registered.
    }
    await UserStore.instance.clearAll();
    if (mounted) setState(() => _done = true);
  }

  @override
  Widget build(BuildContext context) {
    if (_done) {
      return const Text(
        'Daten wurden gelöscht. Beim nächsten Öffnen eines Courts wirst du nach einem Benutzernamen gefragt.',
        style: TextStyle(
            fontSize: 14, fontWeight: FontWeight.w500, color: Color(0xFF15803D)),
      );
    }
    return TextButton(
      onPressed: _clear,
      style: TextButton.styleFrom(
        backgroundColor: AppColors.red50,
        foregroundColor: AppColors.red700,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      ),
      child: const Text('App-Daten löschen',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
    );
  }
}

// ─── Impressum ───────────────────────────────────────────────────────────────

class ImpressumScreen extends StatelessWidget {
  const ImpressumScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _InfoPage(
      title: 'Impressum',
      children: [
        _h1('Impressum'),
        _h2('Angaben gemäß § 5 TMG'),
        _p('Hans Schriefers\nMünzenfeldstraße 28/1\n75449 Wurmberg'),
        _h2('Kontakt'),
        _p('E-Mail: court.app@proton.me'),
        _h2('Haftung für Inhalte'),
        _p('Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.'),
        _h2('Haftung für Links'),
        _p('Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.'),
        _h2('Urheberrecht'),
        _p('Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.'),
      ],
    );
  }
}

// ─── Datenschutz ─────────────────────────────────────────────────────────────

class DatenschutzScreen extends StatelessWidget {
  const DatenschutzScreen({super.key});

  Widget _link(String url) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: InkWell(
          onTap: () => launchUrl(Uri.parse(url),
              mode: LaunchMode.externalApplication),
          child: Text(url,
              style: _body.copyWith(
                  color: AppColors.violet600,
                  decoration: TextDecoration.underline)),
        ),
      );

  @override
  Widget build(BuildContext context) {
    return _InfoPage(
      title: 'Datenschutz',
      children: [
        _h1('Datenschutzerklärung'),
        _h2('1. Datenschutz auf einen Blick'),
        _h3('Allgemeine Hinweise'),
        _p('Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Anwendung nutzen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.'),
        _rich('Da diese Anwendung nach dem Prinzip der **Datenminimierung** entwickelt wurde, erheben wir **keine** Klarnamen, E-Mail-Adressen, Passwörter oder sonstigen direkt identifizierenden Daten.'),
        _h2('2. Verantwortliche Stelle'),
        _p('Verantwortlich für die Datenverarbeitung in dieser Anwendung ist:'),
        _p('Hans Schriefers\nMünzenfeldstraße 28/1\n75449 Wurmberg\ncourt.app@proton.me'),
        _h2('3. Datenverarbeitung in dieser Anwendung'),
        _h3('a) Lokale Speicherung auf dem Gerät'),
        _rich('Damit Sie die Anwendung nutzen können, ohne ein Benutzerkonto anlegen zu müssen, speichert die App den von Ihnen gewählten **Benutzernamen** und eine zufällig erzeugte **Geräte-ID** lokal auf Ihrem Gerät.'),
        _bullets([
          '**Zweck:** Zuordnung Ihrer eingetragenen Zeitfenster in der Benutzeroberfläche.',
          '**Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer nutzerfreundlichen Bereitstellung der Anwendung ohne Registrierungszwang).',
        ]),
        _h3('b) Eintragung von Verfügbarkeits-Slots'),
        _p('Wenn Sie ein Zeitfenster (Slot) eintragen, werden folgende Daten in unserer Datenbank verarbeitet:'),
        _bullets([
          'Der von Ihnen frei wählbare **Benutzername**',
          'Der **Name des Courts / der Gruppe**',
          'Startzeitpunkt und Dauer Ihrer Verfügbarkeit',
        ]),
        _p('Diese Daten sind für alle Personen einsehbar, die den Kurznamen bzw. Link des jeweiligen Courts kennen.'),
        _bullets([
          '**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung bzw. Durchführung der von Ihnen angeforderten Funktion) sowie Art. 6 Abs. 1 lit. a DSGVO (Einwilligung durch aktives Eintragen).',
        ]),
        _h3('c) Push-Benachrichtigungen (optional)'),
        _p('Wenn Sie sich optional dafür entscheiden, Benachrichtigungen über neue Einträge zu erhalten:'),
        _bullets([
          'Wird über Firebase Cloud Messaging (Google Ireland Limited) bzw. den Apple Push Notification Service ein anonymer Geräte-Token erzeugt und zusammen mit dem Court und Ihrer Geräte-ID in unserer Datenbank gespeichert.',
          'Dieser Token enthält keine direkt identifizierenden Daten, ermöglicht es uns aber, Ihrem Gerät Push-Nachrichten zu senden. Die Zustellung erfolgt über die Server von Google bzw. Apple.',
          'Sie können diese Funktion jederzeit über die Glocke im Court, die Systemeinstellungen Ihres Geräts oder „App-Daten löschen“ in der FAQ widerrufen.',
          '**Rechtsgrundlage:** Art. 6 Abs. 1 lit. a DSGVO (Einwilligung).',
        ]),
        _h2('4. Hosting und externe Dienstleister'),
        _h3('Supabase (Datenbank & Backend)'),
        _rich('Wir nutzen für das Hosting der Datenbank und die Bereitstellung von Echtzeit-Funktionen den Dienst **Supabase** (Supabase, Inc.). Die eingetragenen Daten (Benutzername, Courts, Zeitfenster, Push-Tokens) werden auf den Servern von Supabase verarbeitet.'),
        _p('Datenschutzhinweise von Supabase:'),
        _link('https://supabase.com/privacy'),
        _h3('Firebase Cloud Messaging'),
        _p('Für die Zustellung von Push-Benachrichtigungen nutzen wir Firebase Cloud Messaging (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland). Dabei werden der Geräte-Token und der Inhalt der Benachrichtigung an Google übermittelt.'),
        _link('https://firebase.google.com/support/privacy'),
        _bullets([
          '**Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer sicheren und skalierbaren technischen Infrastruktur) bzw. lit. a für Push-Benachrichtigungen.',
        ]),
        _h2('5. Ihre Rechte'),
        _p('Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf:'),
        _bullets([
          '**Auskunft** über Ihre bei uns gespeicherten pseudonymen Daten.',
          '**Löschung** Ihrer eingetragenen Verfügbarkeits-Slots.',
          '**Widerruf** einer erteilten Einwilligung (z. B. für Push-Benachrichtigungen).',
        ]),
        _p('Da wir keine E-Mail-Adressen oder Identitätsnachweise speichern, können Sie Ihre Daten (wie z. B. gespeicherte Zeitfenster oder den lokalen Benutzernamen) in der Regel direkt selbst in der App entfernen.'),
        _p('Bei Fragen wenden Sie sich gerne an die oben genannte verantwortliche Stelle.'),
      ],
    );
  }
}
