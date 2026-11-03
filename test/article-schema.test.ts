import { describe, expect, it } from 'vitest';
import { createArticleSchema, listArticlesQuerySchema, updateArticleSchema } from '../src/modules/articles/article.schema';

const base = { title: 'A good article', podcastName: 'Some Show', host: 'Some Host' };

describe('article schemas', () => {
  it('applies defaults and parses comma separated tags from multipart forms', () => {
    const parsed = createArticleSchema.parse({ ...base, tags: ' startups, , AI ,growth ' });
    expect(parsed.tags).toEqual(['startups', 'AI', 'growth']);
    expect(parsed.category).toBe('Other');
    expect(parsed.status).toBe('PUBLISHED');
    expect(parsed.sourceUrl).toBe('');
  });

  it('defaults tags to an empty list', () => {
    expect(createArticleSchema.parse(base).tags).toEqual([]);
  });

  it('requires the podcast and host', () => {
    expect(createArticleSchema.safeParse({ title: 'A good article' }).success).toBe(false);
  });

  it('only allows http(s) source links, never javascript:', () => {
    expect(createArticleSchema.safeParse({ ...base, sourceUrl: 'https://youtu.be/abc' }).success).toBe(true);
    expect(createArticleSchema.safeParse({ ...base, sourceUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(createArticleSchema.safeParse({ ...base, sourceUrl: 'not a url' }).success).toBe(false);
  });

  it('rejects unknown categories and too many tags', () => {
    expect(createArticleSchema.safeParse({ ...base, category: 'Hacking' }).success).toBe(false);
    expect(createArticleSchema.safeParse({ ...base, tags: 'a,b,c,d,e,f,g,h,i' }).success).toBe(false);
  });

  it('update needs at least one field', () => {
    expect(updateArticleSchema.safeParse({}).success).toBe(false);
    expect(updateArticleSchema.safeParse({ guest: 'New Guest' }).success).toBe(true);
  });

  it('search text must be a plain string (no NoSQL operator objects)', () => {
    expect(listArticlesQuerySchema.safeParse({ q: 'startup' }).success).toBe(true);
    expect(listArticlesQuerySchema.safeParse({ q: { $ne: 'x' } }).success).toBe(false);
  });
});
