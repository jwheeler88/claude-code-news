export type Category = "feature" | "bug-fix" | "performance" | "security" | "improvement" | "misc";

export interface ChangeItem {
  text: string;
  category: Category;
  platform?: string;
}

export interface Release {
  version: string;
  name: string;
  date: string;
  prerelease: boolean;
  items: ChangeItem[];
}
