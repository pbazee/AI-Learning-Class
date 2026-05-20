import { TrustedLogosManager } from "@/components/admin/trusted-logos-manager";
import { prisma } from "@/lib/prisma";


export default async function AdminTrustedLogosPage() {
  const logos = await (async () => {
    try {
      return await prisma.trustedLogo.findMany({
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });
    } catch (error) {
      console.error(
        "[database] admin trusted logos query failed. Returning a safe fallback while the database catches up.",
        error
      );
      return [];
    }
  })();

  return (
    <TrustedLogosManager
      logos={logos.map((logo) => ({
        id: logo.id,
        name: logo.name,
        imageUrl: logo.imageUrl,
        imagePath: logo.imagePath,
        websiteUrl: logo.websiteUrl,
        order: logo.order,
        isActive: logo.isActive,
      }))}
    />
  );
}
