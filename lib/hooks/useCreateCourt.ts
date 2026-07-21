import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

function toSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

/**
 * Encapsulates court name → slug conversion, DB insert, and navigation.
 * Call `create(name)` from the UI; the hook handles the rest.
 */
export function useCreateCourt() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function create(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const slug = toSlug(trimmed);
    if (!slug) {
      setError("Bitte nur Buchstaben und Zahlen verwenden.");
      return;
    }

    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from("courts").insert({
      name: trimmed,
      slug,
      min_people: 4,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    router.push(`/${slug}`);
  }

  return { create, saving, error, clearError: () => setError(null) };
}
