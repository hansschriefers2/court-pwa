import { notFound } from "next/navigation";
import CourtView from "./CourtView";
import { supabase } from "@/lib/supabase/client";
import type { Court } from "@/lib/types";

async function getCourt(slug: string): Promise<Court | null> {
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
