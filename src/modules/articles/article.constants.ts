/** Keep in sync with frontend/src/lib/site.ts (CATEGORIES). */
export const ARTICLE_CATEGORIES = [
  'Business & Startups',
  'Investing & Finance',
  'Technology & AI',
  'Health & Wellness',
  'Mindset & Productivity',
  'Career & Education',
  'Society & Culture',
  'Other',
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];
