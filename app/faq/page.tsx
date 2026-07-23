import Link from "next/link";
import FAQAccordion from "./FAQAccordion";
import ClearDataButton from "./ClearDataButton";

export const metadata = { title: "FAQ – Court" };

const FAQS = [
  {
    q: "Was ist Court?",
    a: "Court ist eine einfache App, mit der du und deine Gruppe Verfügbarkeiten für euren Platz eintragen und auf einen Blick sehen könnt, wer wann Zeit hat – ganz ohne Registrierung.",
  },
  {
    q: "Muss ich ein Konto anlegen?",
    a: "Nein. Du wählst beim ersten Besuch eines Courts nur einen Benutzernamen, der lokal in deinem Browser gespeichert wird. Es gibt keine Registrierung, kein Passwort und keine E-Mail-Adresse.",
  },
  {
    q: "Wie teile ich meinen Court mit anderen?",
    a: "Gib deinen Freunden einfach den Link (URL) deines Courts weiter. Wer den Link kennt, kann die eingetragenen Slots sehen und eigene hinzufügen.",
  },
  {
    q: "Wie trage ich einen Slot ein?",
    a: 'Öffne deinen Court und tippe auf den \"+\"-Button im Zeitplan. Wähle Start- und Endzeit und speichere den Slot.',
  },
  {
    q: "Kann ich einen Slot wieder löschen?",
    a: "Ja. Tippe auf einen deiner eigenen Slots im Zeitplan – dort erscheint ein Menü mit der Option zum Löschen oder Bearbeiten.",
  },
  {
    q: "Was sind Push-Benachrichtigungen und wie aktiviere ich sie?",
    a: "Mit Push-Benachrichtigungen wirst du informiert, wenn jemand anderes einen neuen Slot in deinem Court einträgt. Tippe dazu auf das Glocken-Symbol in der oberen Leiste und erlaube Benachrichtigungen im Browser-Dialog.",
  },
  {
    q: "Funktionieren Push-Benachrichtigungen auf dem iPhone?",
    a: "Ja, aber nur wenn die App zum Home-Bildschirm hinzugef\u00fcgt wurde (PWA). \u00d6ffne dazu die App in Safari, tippe auf das Teilen-Symbol und w\u00e4hle \u201eZum Home-Bildschirm\u201c. Danach kannst du Benachrichtigungen aktivieren.",
  },
  {
    q: "Wie kann ich meinen Benutzernamen ändern?",
    a: "Aktuell wird der Benutzername pro Court beim ersten Besuch festgelegt und lokal gespeichert. Du kannst ihn zurücksetzen, indem du die Browser-Daten (LocalStorage) für diese Seite löschst und die Seite neu lädst.",
  },
  {
    q: "Welche Daten werden gespeichert?",
    a: "Nur dein selbst gewählter Benutzername (lokal im Browser), die von dir eingetragenen Zeitfenster sowie – wenn du Benachrichtigungen aktivierst – ein anonymer Push-Token. Keine E-Mail, kein Klarname, kein Passwort. Details findest du in der Datenschutzerklärung.",
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-dvh bg-gray-100 px-4 py-10">
      <div className="mx-auto max-w-prose">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Zurück
        </Link>

        <div className="rounded-2xl bg-white px-6 py-8 shadow-xl">
          <h1 className="mb-2 text-xl font-bold text-gray-900">
            Häufige Fragen (FAQ)
          </h1>

          <FAQAccordion faqs={FAQS} />

          <div className="mt-8 border-t border-gray-100 pt-6">
            <p className="mb-3 text-sm text-gray-500">
              Benutzernamen und Geräte-ID aus den Browser-Cookies entfernen:
            </p>
            <ClearDataButton />
          </div>
        </div>
      </div>
    </div>
  );
}
