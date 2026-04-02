import { TrustedLogosManager } from "@/components/admin/trusted-logos-manager";
import { prisma } from "@/lib/prisma";

export default async function AdminTrustedLogosPage() {
  const logos = await prisma.trustedLogo.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

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
