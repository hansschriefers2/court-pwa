import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import CourtView from "./CourtView";
import type { Court } from "@/lib/types";

/**
 * Fetch court data server-side so we can 404 before rendering the client shell.
 * Uses the publishable (anon) key — courts are publicly readable.
 */
async function getCourt(slug: string): Promise<Court | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Support both key name conventions
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  );

  const { data, error } = await supabase
    .from("courts")
    .select("id, name, slug, min_people")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return data as Court;
}

export default async function CourtPage({
  params,
}: {
  params: Promise<{ courtName: string }>;
}) {
  const { courtName } = await params;
  const court = await getCourt(courtName);

  if (!court) notFound();

  return <CourtView court={court} />;
}
