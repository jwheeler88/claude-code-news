import { categorize } from "./categorizer";
import type { ChangeItem } from "./types";

export function parseReleaseBody(body: string): ChangeItem[] {
  if (!body) return [];

  const lines = body.split("\n");
  const items: ChangeItem[] = [];

  for (const line of lines) {
    const match = line.match(/^-\s+(.+)/);
    if (!match) continue;
    let text = match[1].trim();
    if (!text) continue;

    let platform: string | undefined;

    // "VSCode: some text" → platform "VSCode"
    const prefixMatch = text.match(/^(\w+):\s+(.+)/);
    if (prefixMatch && ["VSCode", "IDE", "SDK"].includes(prefixMatch[1])) {
      platform = prefixMatch[1];
      text = prefixMatch[2];
    }

    // "[VSCode] some text" → platform "VSCode"
    const bracketMatch = text.match(/^\[([^\]]+)\]\s+(.+)/);
    if (!platform && bracketMatch) {
      platform = bracketMatch[1];
      text = bracketMatch[2];
    }

    items.push({ text, category: categorize(text), ...(platform && { platform }) });
  }

  return items;
}
