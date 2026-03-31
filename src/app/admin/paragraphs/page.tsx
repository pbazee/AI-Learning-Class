import { HomepageParagraphsManager } from "@/components/admin/homepage-paragraphs-manager";
import { getHomepageParagraphEntries } from "@/lib/data";

export default async function AdminHomepageParagraphsPage() {
  const paragraphs = await getHomepageParagraphEntries();

  return <HomepageParagraphsManager paragraphs={paragraphs} />;
}
