export type Category = "feature" | "bug-fix" | "performance" | "security" | "improvement";

export interface ChangeItem {
  text: string;
  category: Category;
}

export interface Release {
  version: string;
  name: string;
  date: string;
  prerelease: boolean;
  items: ChangeItem[];
}
