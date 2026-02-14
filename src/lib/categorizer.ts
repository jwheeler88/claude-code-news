import type { Category } from "./types";

export function categorize(text: string): Category {
  const lower = text.toLowerCase();

  if (/^fix(ed)?\b/.test(lower)) return "bug-fix";
  if (/performance|faster|rendering/.test(lower)) return "performance";
  if (/security|secret|blocked|prevent/.test(lower)) return "security";
  if (/^(added|new)\b/.test(lower) || lower.includes("is now available")) return "feature";
  if (/^improved?\b/.test(lower)) return "improvement";

  return "misc";
}
