import { getSettings } from "@/lib/settings";
import LandingClient from "@/components/LandingClient";

export default async function Page() {
  const settings = await getSettings();
  return <LandingClient settings={settings} />;
}
