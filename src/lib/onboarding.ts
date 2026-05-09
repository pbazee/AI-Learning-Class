import type { Course } from "@/types";

export const onboardingQuizQuestions = [
  {
    id: "q1",
    question: "What's your current AI experience level?",
    options: [
      "Complete beginner",
      "Some coding experience",
      "Data science background",
      "Experienced ML practitioner",
    ],
  },
  {
    id: "q2",
    question: "What's your primary goal?",
    options: [
      "Land an AI job",
      "Build AI products",
      "Research & academia",
      "Understand AI for my business",
    ],
  },
  {
    id: "q3",
    question: "How much time can you dedicate weekly?",
    options: ["1-3 hours", "4-7 hours", "8-15 hours", "15+ hours"],
  },
  {
    id: "q4",
    question: "Which AI domain excites you most?",
    options: [
      "Generative AI & LLMs",
      "Machine Learning",
      "Computer Vision",
      "AI Engineering & MLOps",
    ],
  },
] as const;

export type OnboardingQuizAnswers = Record<string, number>;

const expectedQuestionIds = onboardingQuizQuestions.map((question) => question.id);

function normalizeText(value: string) {
  return value.toLowerCase();
}

function buildKeywordBlob(course: Course) {
  return normalizeText(
    [
      course.title,
      course.shortDescription,
      course.description,
      course.categoryName,
      ...(course.tags ?? []),
      ...(course.whatYouLearn ?? []),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function includesAny(haystack: string, keywords: string[]) {
  return keywords.some((keyword) => haystack.includes(keyword));
}

export function isValidOnboardingQuizAnswers(value: unknown): value is OnboardingQuizAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return expectedQuestionIds.every((questionId) => {
    const answer = (value as Record<string, unknown>)[questionId];
    return typeof answer === "number" && Number.isInteger(answer) && answer >= 0 && answer <= 3;
  });
}

export function getRecommendedCourses(
  courses: Course[],
  answers: OnboardingQuizAnswers,
  limit = 4
) {
  const experience = answers.q1 ?? 0;
  const goal = answers.q2 ?? 0;
  const timeCommitment = answers.q3 ?? 0;
  const domain = answers.q4 ?? 0;

  const levelTargets =
    experience === 0
      ? ["BEGINNER"]
      : experience === 1
        ? ["BEGINNER", "INTERMEDIATE"]
        : experience === 2
          ? ["INTERMEDIATE", "ADVANCED"]
          : ["ADVANCED", "INTERMEDIATE"];

  const goalKeywords = [
    ["career", "job", "interview", "portfolio", "machine learning", "engineering"],
    ["product", "build", "ship", "llm", "agent", "prompt", "automation"],
    ["research", "theory", "deep learning", "machine learning", "vision"],
    ["business", "strategy", "beginner", "ai for everyone", "workflow"],
  ][goal] ?? [];

  const domainKeywords = [
    ["llm", "generative", "prompt", "agent", "chatgpt"],
    ["machine learning", "ml", "model", "data science"],
    ["vision", "image", "computer vision"],
    ["mlops", "deployment", "production", "engineering", "systems"],
  ][domain] ?? [];

  return [...courses]
    .map((course) => {
      const blob = buildKeywordBlob(course);
      let score = 0;

      if (levelTargets.includes(course.level)) {
        score += 5;
      } else if (
        (course.level === "BEGINNER" && levelTargets.includes("INTERMEDIATE")) ||
        (course.level === "INTERMEDIATE" && levelTargets.includes("ADVANCED"))
      ) {
        score += 2;
      }

      if (includesAny(blob, goalKeywords)) {
        score += 5;
      }

      if (includesAny(blob, domainKeywords)) {
        score += 7;
      }

      if (course.isFeatured) {
        score += 2;
      }

      if (course.isTrending || course.isRecommended) {
        score += 2;
      }

      if (experience === 0 && course.isFree) {
        score += 1;
      }

      if (timeCommitment <= 1 && course.totalDuration > 0 && course.totalDuration <= 6 * 60 * 60) {
        score += 2;
      }

      if (timeCommitment >= 2 && course.totalDuration >= 8 * 60 * 60) {
        score += 1;
      }

      score += Math.min(course.rating, 5);
      score += Math.min(course.totalStudents / 500, 2);

      return { course, score };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.course.rating !== left.course.rating) {
        return right.course.rating - left.course.rating;
      }

      return right.course.totalStudents - left.course.totalStudents;
    })
    .slice(0, limit)
    .map((entry) => entry.course);
}
