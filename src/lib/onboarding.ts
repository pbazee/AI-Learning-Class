import type { Course, OnboardingQuizAnswers } from "@/types";

export const onboardingQuizQuestions = [
  {
    id: "experience",
    question: "What is your current AI experience?",
    options: [
      { value: "beginner", label: "Complete beginner - just getting started" },
      { value: "basics", label: "I know the basics - used ChatGPT, some tools" },
      { value: "intermediate", label: "Intermediate - built a few AI projects" },
      { value: "advanced", label: "Advanced - ML engineer or data scientist" },
      { value: "other", label: "Other — I'll describe my background" },
    ],
  },
  {
    id: "goal",
    question: "What is your main goal?",
    options: [
      { value: "career", label: "Switch careers into AI" },
      { value: "skills", label: "Upgrade my current skills" },
      { value: "projects", label: "Build AI-powered projects or products" },
      { value: "business", label: "Apply AI to grow my business" },
      { value: "other", label: "Other — My goal is different" },
    ],
  },
  {
    id: "time",
    question: "How much time can you dedicate per week?",
    options: [
      { value: "1-3hrs", label: "1-3 hours (casual pace)" },
      { value: "3-5hrs", label: "3-5 hours (steady progress)" },
      { value: "5-10hrs", label: "5-10 hours (fast track)" },
      { value: "10+hrs", label: "10+ hours (full commitment)" },
      { value: "other", label: "Other — My schedule varies" },
    ],
  },
  {
    id: "category_id",
    question: "Which area interests you most?",
    options: [],
  },
] as const;

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

  const answers = value as Record<string, unknown>;

  return (
    typeof answers.experience === "string" &&
    typeof answers.goal === "string" &&
    typeof answers.time === "string" &&
    typeof answers.category_id === "string" &&
    (answers.experience !== "other" ||
      (typeof answers.experience_other === "string" && answers.experience_other.trim().length > 0)) &&
    (answers.goal !== "other" ||
      (typeof answers.goal_other === "string" && answers.goal_other.trim().length > 0)) &&
    (answers.time !== "other" ||
      (typeof answers.time_other === "string" && answers.time_other.trim().length > 0)) &&
    (answers.category_id !== "other" ||
      (typeof answers.category_other === "string" && answers.category_other.trim().length > 0)) &&
    answers.category_id.trim().length > 0
  );
}

export function getRecommendedCourses(
  courses: Course[],
  answers: OnboardingQuizAnswers,
  limit = 3
) {
  const experience = answers.experience;
  const goal = answers.goal;
  const timeCommitment = answers.time;
  const selectedCategoryId = answers.category_id;

  const levelTargets: Course["level"][] =
    experience === "beginner"
      ? ["BEGINNER", "ALL_LEVELS"]
      : experience === "basics"
        ? ["BEGINNER", "INTERMEDIATE", "ALL_LEVELS"]
        : experience === "intermediate"
          ? ["INTERMEDIATE", "ADVANCED", "ALL_LEVELS"]
          : ["ADVANCED", "INTERMEDIATE", "ALL_LEVELS"];

  const goalKeywords =
    goal === "career"
      ? ["career", "job", "interview", "portfolio", "foundational", "machine learning"]
      : goal === "skills"
        ? ["skill", "upskill", "practical", "hands-on", "workflow", "productivity"]
        : goal === "projects"
          ? ["build", "product", "ship", "agent", "automation", "llm", "prompt"]
          : ["business", "marketing", "content", "workflow", "growth", "automation"];

  const ranked = [...courses]
    .filter((course) => course.categoryId === selectedCategoryId)
    .map((course) => {
      const blob = buildKeywordBlob(course);
      let score = 0;

      if (levelTargets.includes(course.level)) {
        score += 5;
      }

      if (includesAny(blob, goalKeywords)) {
        score += 5;
      }

      if (course.isFeatured) {
        score += 2;
      }

      if (course.isTrending || course.isRecommended) {
        score += 2;
      }

      if (experience === "beginner" && course.isFree) {
        score += 1;
      }

      if (timeCommitment === "1-3hrs" && course.totalDuration > 0 && course.totalDuration <= 6 * 60 * 60) {
        score += 2;
      }

      if (
        (timeCommitment === "5-10hrs" || timeCommitment === "10+hrs") &&
        course.totalDuration >= 8 * 60 * 60
      ) {
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
    });

  const matches = ranked.slice(0, limit).map((entry) => entry.course);

  if (matches.length >= limit) {
    return matches;
  }

  const fallback = courses
    .filter((course) => levelTargets.includes(course.level) || course.isFeatured)
    .sort((left, right) => {
      if (Number(right.isFeatured) !== Number(left.isFeatured)) {
        return Number(right.isFeatured) - Number(left.isFeatured);
      }

      return right.rating - left.rating;
    })
    .filter((course) => !matches.some((match) => match.id === course.id))
    .slice(0, limit - matches.length);

  return [...matches, ...fallback];
}
