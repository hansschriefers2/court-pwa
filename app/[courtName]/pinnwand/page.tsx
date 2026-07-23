import { notFound } from "next/navigation";
import PinboardView from "./PinboardView";
import { supabase } from "@/lib/supabase/client";
import type { Court } from "@/lib/types";

async function getCourt(slug: string): Promise<Court | null> {
  const { data, error } = await supabase
    .from("courts")
    .select("id, name, slug, min_people, description, maps_url")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return data as Court;
}

export default async function PinboardPage({
  params,
}: {
  params: Promise<{ courtName: string }>;
}) {
  const { courtName } = await params;
  const court = await getCourt(courtName);

  if (!court) notFound();

  return <PinboardView court={court} />;
}
