import { z } from 'zod';
import { objectIdSchema } from '../../shared/object-id';
import { ARTICLE_CATEGORIES } from './article.constants';
import { ARTICLE_STATUSES } from './article.model';

function isHttpUrl(value: string): boolean {
  if (value === '') return true; // empty clears the field
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

// Multipart forms send tags as "a, b, c"; JSON clients may send an array. Accept both.
const tags = z.preprocess(
  (value) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : value,
  z.array(z.string().trim().min(1).max(30)).max(8, 'Use at most 8 tags'),
);

const fields = {
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  summary: z.string().trim().max(2000),
  content: z.string().trim().max(60_000, 'Article text is too long'),
  podcastName: z.string().trim().min(2, 'Podcast name is required').max(120),
  host: z.string().trim().min(2, 'Host name is required').max(120),
  guest: z.string().trim().max(120),
  // Only http(s): blocks `javascript:` links, since this value is rendered as an <a href>.
  sourceUrl: z.string().trim().max(500).refine(isHttpUrl, 'Enter a valid http(s) link, or leave it empty'),
  category: z.enum(ARTICLE_CATEGORIES),
  tags,
  status: z.enum(ARTICLE_STATUSES),
};

export const createArticleSchema = z.object({
  title: fields.title,
  podcastName: fields.podcastName,
  host: fields.host,
  summary: fields.summary.default(''),
  content: fields.content.default(''),
  guest: fields.guest.default(''),
  sourceUrl: fields.sourceUrl.default(''),
  category: fields.category.default('Other'),
  tags: fields.tags.default([]),
  status: fields.status.default('PUBLISHED'),
});

export const updateArticleSchema = z
  .object(fields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');

export const listArticlesQuerySchema = z.object({
  cursor: z.string().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  status: z.enum(ARTICLE_STATUSES).optional(),
  category: z.enum(ARTICLE_CATEGORIES).optional(),
  // Plain string only: an object such as ?q[$ne]=x is rejected by the type check.
  q: z.string().trim().min(1).max(100).optional(),
});

export const articleIdParamSchema = z.object({ id: objectIdSchema });

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
export type ListArticlesQuery = z.infer<typeof listArticlesQuerySchema>;
