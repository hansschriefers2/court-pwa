interface Props {
  courtName: string;
  inputName: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
}

export default function UsernameModal({
  courtName,
  inputName,
  onChange,
  onConfirm,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="w-80 rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="username-modal-title"
        aria-describedby="username-modal-desc"
      >
        <img
          src="/icon_1024.png"
          alt=""
          width={48}
          height={48}
          className="mb-4 rounded-xl"
        />
        <h2 id="username-modal-title" className="mb-1 text-lg font-semibold text-gray-800">
          Wie heißt du?
        </h2>
        <p id="username-modal-desc" className="mb-4 text-sm text-gray-500">
          Dein Name erscheint auf deinen Verfügbarkeitsslots auf dem Platz{" "}
          <span className="font-medium text-gray-700">{courtName}</span>.
        </p>
        <input
          autoFocus
          type="text"
          placeholder="Dein Name"
          value={inputName}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onConfirm()}
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-lime-400"
        />
        <button
          onClick={onConfirm}
          disabled={!inputName.trim()}
          className="w-full rounded-lg bg-lime-400 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-lime-300 disabled:opacity-40"
        >
          Weiter
        </button>
      </div>
    </div>
  );
}
