function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(value: string) {
  return stripHtml(value)
    .split(/\s+/)
    .filter(Boolean).length;
}

export function estimateReadingTimeMinutes(value: string, wordsPerMinute = 200) {
  const safeWordsPerMinute = Math.max(1, wordsPerMinute);
  return Math.max(1, Math.ceil(countWords(value) / safeWordsPerMinute));
}

export function formatReadingTime(value: string, wordsPerMinute = 200) {
  return `${estimateReadingTimeMinutes(value, wordsPerMinute)} min read`;
}
