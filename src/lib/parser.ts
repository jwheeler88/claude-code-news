import { categorize } from "./categorizer";
import type { ChangeItem } from "./types";

export function parseReleaseBody(body: string): ChangeItem[] {
  if (!body) return [];

  const lines = body.split("\n");
  const items: ChangeItem[] = [];

  for (const line of lines) {
    const match = line.match(/^-\s+(.+)/);
    if (!match) continue;
    const text = match[1].trim();
    if (!text) continue;
    items.push({ text, category: categorize(text) });
  }

  return items;
}
