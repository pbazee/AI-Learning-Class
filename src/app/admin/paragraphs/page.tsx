import { HomepageParagraphsManager } from "@/components/admin/homepage-paragraphs-manager";
import { getHomepageParagraphEntries } from "@/lib/data";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function AdminHomepageParagraphsPage() {
  const paragraphs = await getHomepageParagraphEntries();

  return <HomepageParagraphsManager paragraphs={paragraphs} />;
}
