// Simple reading time estimator used across blog posts
export function estimateReadingTime(text: string, wpm = 200) {
  if (!text) return { minutes: 0, text: "< 1 min read" };
  // strip markdown/HTML-like content to get a reasonable word count
  const stripped = text
    .replace(/<[^>]*>/g, " ") // remove HTML tags
    .replace(/```[\s\S]*?```/g, " ") // remove fenced code blocks
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ") // remove markdown links
    .replace(/[#>*`\-=_]/g, " ") // remove some markdown punctuation
    .replace(/\s+/g, " ")
    .trim();

  if (!stripped) return { minutes: 0, text: "< 1 min read" };

  const words = stripped.split(" ").length;
  const minutes = Math.max(1, Math.ceil(words / wpm));
  return { minutes, text: `${minutes} min read` };
}

export default estimateReadingTime;
