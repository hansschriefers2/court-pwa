import HomeClient from "./HomeClient";

// Opt out of static prerendering so the Supabase client is only
// initialised at request time (when env vars are available).
export const dynamic = "force-dynamic";

export default function Page() {
  return <HomeClient />;
}
