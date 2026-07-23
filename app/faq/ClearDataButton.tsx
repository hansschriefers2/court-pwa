"use client";

import { useState } from "react";

function deleteCookie(name: string) {
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export default function ClearDataButton() {
  const [done, setDone] = useState(false);

  function handleClear() {
    deleteCookie("court_username");
    deleteCookie("court_user_id");
    setDone(true);
  }

  if (done) {
    return (
      <p className="text-sm text-green-700 font-medium">
        Daten wurden gelöscht. Beim nächsten Besuch eines Courts wirst du nach einem Benutzernamen gefragt.
      </p>
    );
  }

  return (
    <button
      onClick={handleClear}
      className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 active:bg-red-200 transition-colors"
    >
      Cookies dieser App löschen
    </button>
  );
}
