import Link from "next/link";

export const metadata = { title: "Datenschutz – Court" };

export default function DatenschutzPage() {
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

        <div className="rounded-2xl bg-white p-8 shadow-xl prose prose-sm prose-gray max-w-none">
          <h1>Datenschutzerklärung</h1>

          <h2>1. Datenschutz auf einen Blick</h2>
          <h3>Allgemeine Hinweise</h3>
          <p>
            Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren
            personenbezogenen Daten passiert, wenn Sie diese Website/Anwendung nutzen.
            Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert
            werden können.
          </p>
          <p>
            Da diese Anwendung nach dem Prinzip der <strong>Datenminimierung</strong> entwickelt
            wurde, erheben wir <strong>keine</strong> Klarnamen, E-Mail-Adressen, Passwörter
            oder sonstigen direkt identifizierenden Daten.
          </p>

          <h2>2. Verantwortliche Stelle</h2>
          <p>Verantwortlich für die Datenverarbeitung auf dieser Website ist:</p>
          <p>
            Hans Schriefers<br />
            Münzenfeldstraße 28/1<br />
            75449 Wurmberg<br />
            court.app@proton.me
          </p>

          <h2>3. Datenverarbeitung in dieser Anwendung</h2>
          <h3>a) Lokale Speicherung (Cookies / LocalStorage)</h3>
          <p>
            Damit Sie die Anwendung nutzen können, ohne ein Benutzerkonto anlegen zu müssen,
            speichert die Anwendung den von Ihnen gewählten <strong>Benutzernamen</strong> lokal
            in Ihrem Browser (via Cookies oder LocalStorage).
          </p>
          <ul>
            <li>
              <strong>Zweck:</strong> Zuordnung Ihrer eingetragenen Zeitfenster in der
              Benutzeroberfläche.
            </li>
            <li>
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
              Interesse an einer nutzerfreundlichen Bereitstellung der Anwendung ohne
              Registrierungszwang).
            </li>
          </ul>

          <h3>b) Eintragung von Verfügbarkeits-Slots</h3>
          <p>
            Wenn Sie ein Zeitfenster (Slot) eintragen, werden folgende Daten in unserer
            Datenbank verarbeitet:
          </p>
          <ul>
            <li>Der von Ihnen frei wählbare <strong>Benutzername</strong></li>
            <li>Der <strong>Name des Courts / der Gruppe</strong> (aus dem URL-Parameter)</li>
            <li>Startzeitpunkt und Dauer Ihrer Verfügbarkeit</li>
          </ul>
          <p>
            Diese Daten sind für alle Personen einsehbar, die über den genauen Link (URL) des
            jeweiligen Courts verfügen.
          </p>
          <ul>
            <li>
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung
              bzw. Durchführung der von Ihnen angeforderten Funktion) sowie Art. 6 Abs. 1
              lit. a DSGVO (Einwilligung durch aktives Eintragen).
            </li>
          </ul>

          <h3>c) Web Push-Benachrichtigungen (optional)</h3>
          <p>
            Wenn Sie sich optional dafür entscheiden, Benachrichtigungen über neue Einträge zu
            erhalten:
          </p>
          <ul>
            <li>
              Wird von Ihrem Browser ein anonymer Identifikator (Push-Subscription-Token)
              generiert und in unserer Datenbank gespeichert.
            </li>
            <li>
              Dieser Token enthält keine personenbezogenen Daten, ermöglicht es uns aber, Ihrem
              Browser Push-Nachrichten zu senden.
            </li>
            <li>
              Sie können diese Funktion jederzeit über die Einstellungen Ihres Browsers oder
              das Löschen der App-Daten widerrufen.
            </li>
            <li>
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung).
            </li>
          </ul>

          <h2>4. Hosting und externe Dienstleister</h2>
          <h3>Supabase (Datenbank &amp; Backend)</h3>
          <p>
            Wir nutzen für das Hosting der Datenbank und die Bereitstellung von
            Echtzeit-Funktionen den Dienst <strong>Supabase</strong> (Supabase, Inc.). Die
            eingetragenen Daten (Benutzername, Courts, Zeitfenster, Push-Tokens) werden auf den
            Servern von Supabase verarbeitet.
          </p>
          <ul>
            <li>
              <strong>Datenschutzhinweise von Supabase:</strong>{" "}
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://supabase.com/privacy
              </a>
            </li>
            <li>
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
              Interesse an einer sicheren und skalierbaren technischen Infrastruktur).
            </li>
          </ul>

          <h2>5. Ihre Rechte</h2>
          <p>
            Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf:
          </p>
          <ul>
            <li>
              <strong>Auskunft</strong> über Ihre bei uns gespeicherten pseudonymen Daten.
            </li>
            <li>
              <strong>Löschung</strong> Ihrer eingetragenen Verfügbarkeits-Slots.
            </li>
            <li>
              <strong>Widerruf</strong> einer erteilten Einwilligung (z. B. für
              Web-Push-Benachrichtigungen).
            </li>
          </ul>
          <p>
            Da wir keine E-Mail-Adressen oder Identitätsnachweise speichern, können Sie Ihre
            Daten (wie z. B. gespeicherte Zeitfenster oder den lokalen Benutzernamen) in der
            Regel direkt selbst in der Anwendung oder über das Löschen Ihrer
            Browser-Daten/Cookies entfernen.
          </p>
          <p>
            Bei Fragen wenden Sie sich gerne an die oben genannte verantwortliche Stelle.
          </p>
        </div>
      </div>
    </div>
  );
}
