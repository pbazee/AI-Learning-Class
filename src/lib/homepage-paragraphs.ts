export const HOMEPAGE_PARAGRAPH_SECTION_KEYS = [
  "learning_paths_subtitle",
  "featured_courses_subtitle",
  "trending_now_subtitle",
  "most_popular_subtitle",
  "new_releases_subtitle",
] as const;

export type HomepageParagraphSectionKey = (typeof HOMEPAGE_PARAGRAPH_SECTION_KEYS)[number];

export const HOMEPAGE_PARAGRAPH_SECTIONS = [
  {
    sectionKey: "learning_paths_subtitle",
    sectionName: "Learning Paths subtitle",
    defaultContent:
      "Choose the capability you want to build next, from machine learning foundations to advanced AI engineering.",
  },
  {
    sectionKey: "featured_courses_subtitle",
    sectionName: "Featured Courses subtitle",
    defaultContent: "Handpicked by our team for maximum career impact.",
  },
  {
    sectionKey: "trending_now_subtitle",
    sectionName: "Trending Now subtitle",
    defaultContent: "What the global AI community is enrolling in this week.",
  },
  {
    sectionKey: "most_popular_subtitle",
    sectionName: "Most Popular subtitle",
    defaultContent: "Top courses by total enrollment - proven and trusted.",
  },
  {
    sectionKey: "new_releases_subtitle",
    sectionName: "New Releases subtitle",
    defaultContent: "Fresh content on the latest AI tools, models, and techniques.",
  },
] as const satisfies ReadonlyArray<{
  sectionKey: HomepageParagraphSectionKey;
  sectionName: string;
  defaultContent: string;
}>;

export type HomepageParagraphContentMap = Record<HomepageParagraphSectionKey, string>;

export type HomepageParagraphEntry = {
  id: string | null;
  sectionKey: HomepageParagraphSectionKey;
  sectionName: string;
  defaultContent: string;
  content: string;
  updatedAt: string | null;
  isDefault: boolean;
};

export const HOMEPAGE_PARAGRAPH_DEFAULTS = HOMEPAGE_PARAGRAPH_SECTIONS.reduce(
  (accumulator, section) => {
    accumulator[section.sectionKey] = section.defaultContent;
    return accumulator;
  },
  {} as HomepageParagraphContentMap
);
