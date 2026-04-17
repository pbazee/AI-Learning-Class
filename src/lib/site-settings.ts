export const DEFAULT_ABOUT_CONTENT = {
  eyebrow: "About AI GENIUS LAB",
  title: "Practical AI education for people building real careers.",
  subtitle:
    "AI GENIUS LAB helps learners move from curiosity to capability with structured courses, production-minded projects, and guided progress that keeps momentum high.",
  mission:
    "Our mission is to make high-quality AI learning clear, hands-on, and globally accessible for ambitious learners, teams, and operators.",
  story:
    "We focus on courses that translate directly into better decisions, stronger technical fluency, and real project delivery. That means less hype, more clarity, and a learning experience designed for outcomes.",
  promise:
    "Every program is designed to feel useful on day one: concrete lessons, practical examples, guided progress, and credentials learners can actually share with confidence.",
  statOneValue: "24/7",
  statOneLabel: "Access on desktop and mobile",
  statTwoValue: "Hands-on",
  statTwoLabel: "Coursework built for real application",
  statThreeValue: "Global",
  statThreeLabel: "Built for learners everywhere",
  valueOneTitle: "Practical first",
  valueOneBody:
    "Courses prioritize execution, not just theory, so learners can apply what they study immediately.",
  valueTwoTitle: "Structured progress",
  valueTwoBody:
    "Learning paths, clear sequencing, and progress tracking keep students moving with confidence.",
  valueThreeTitle: "Career-minded quality",
  valueThreeBody:
    "Certificates, polished content, and real-world topics help learners turn progress into proof.",
};

export type AboutContent = {
  [Key in keyof typeof DEFAULT_ABOUT_CONTENT]: string;
};

export function normalizeSiteSettingsSocialLinks(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, string>;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [key, String(entryValue ?? "")])
  );
}

function readAboutField(
  socialLinks: Record<string, string>,
  key: keyof AboutContent
) {
  const storageKey = `about${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  const value = socialLinks[storageKey]?.trim();
  return value || DEFAULT_ABOUT_CONTENT[key];
}

export function getAboutContentFromSocialLinks(value: unknown): AboutContent {
  const socialLinks = normalizeSiteSettingsSocialLinks(value);

  return {
    eyebrow: readAboutField(socialLinks, "eyebrow"),
    title: readAboutField(socialLinks, "title"),
    subtitle: readAboutField(socialLinks, "subtitle"),
    mission: readAboutField(socialLinks, "mission"),
    story: readAboutField(socialLinks, "story"),
    promise: readAboutField(socialLinks, "promise"),
    statOneValue: readAboutField(socialLinks, "statOneValue"),
    statOneLabel: readAboutField(socialLinks, "statOneLabel"),
    statTwoValue: readAboutField(socialLinks, "statTwoValue"),
    statTwoLabel: readAboutField(socialLinks, "statTwoLabel"),
    statThreeValue: readAboutField(socialLinks, "statThreeValue"),
    statThreeLabel: readAboutField(socialLinks, "statThreeLabel"),
    valueOneTitle: readAboutField(socialLinks, "valueOneTitle"),
    valueOneBody: readAboutField(socialLinks, "valueOneBody"),
    valueTwoTitle: readAboutField(socialLinks, "valueTwoTitle"),
    valueTwoBody: readAboutField(socialLinks, "valueTwoBody"),
    valueThreeTitle: readAboutField(socialLinks, "valueThreeTitle"),
    valueThreeBody: readAboutField(socialLinks, "valueThreeBody"),
  };
}

