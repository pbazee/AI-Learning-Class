import { getSiteBranding } from "@/lib/site-server";
import { NavbarClient } from "./NavbarClient";

export async function Navbar({
  branding: providedBranding,
}: {
  branding?: { siteName: string; logoUrl?: string };
}) {
  const branding = providedBranding || (await getSiteBranding());

  return <NavbarClient branding={branding} />;
}
