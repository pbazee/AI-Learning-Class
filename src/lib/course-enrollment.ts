export async function enrollInFreeCourse(courseId: string) {
  const response = await fetch(`/api/courses/${courseId}/enroll`, {
    method: "POST",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Unable to enroll in this course right now.");
  }

  return payload as { redirectTo: string };
}
