import HomeClient from "./HomeClient";

// Render this route dynamically (avoid static prerendering).
export const dynamic = "force-dynamic";

export default function Page() {
  return <HomeClient />;
}
