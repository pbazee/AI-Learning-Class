import { getFooterSettings } from "@/lib/site-server";
import { FooterClient } from "./FooterClient";

export async function Footer() {
  const settings = await getFooterSettings();

  return <FooterClient settings={settings} />;
}
