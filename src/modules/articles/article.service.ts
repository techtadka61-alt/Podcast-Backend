import { Errors } from '../../core/errors';
import { decodeCursor, toPage, type Page } from '../../shared/pagination';
import { hasPermission, Permission } from '../../shared/rbac';
import type { AuthenticatedUser } from '../../shared/http';
import {
  articleRepository,
  toArticle,
  type Article,
  type ArticleFile,
  type PodcastSummary,
} from './article.repository';
import type { CreateArticleInput, ListArticlesQuery, UpdateArticleInput } from './article.schema';
import { articleStorage } from './article.storage';

export interface UploadedFile {
  tmpPath: string;
  originalName: string;
  size: number;
}

/** Anonymous visitors (no user) and regular users only ever see published articles. */
const canSeeDrafts = (user?: AuthenticatedUser) => !!user && hasPermission(user.role, Permission.ARTICLE_READ_DRAFT);

const WORDS_PER_MINUTE = 200;
const readingMinutes = (content: string) =>
  Math.max(1, Math.ceil(content.split(/\s+/).filter(Boolean).length / WORDS_PER_MINUTE));

export const articleService = {
  async create(input: CreateArticleInput, file: UploadedFile, user: AuthenticatedUser): Promise<Article> {
    let fileKey: string | undefined;
    try {
      await articleStorage.assertPdf(file.tmpPath);
      fileKey = await articleStorage.commit(file.tmpPath);
      return await articleRepository.insert({
        ...input,
        readingMinutes: readingMinutes(input.content),
        fileKey,
        fileName: file.originalName.slice(0, 255),
        fileSize: file.size,
        createdBy: user.id,
      });
    } catch (err) {
      // Never leave orphaned files behind when validation or the insert fails.
      if (fileKey) await articleStorage.remove(fileKey);
      else await articleStorage.discardTemp(file.tmpPath);
      throw err;
    }
  },

  async list(query: ListArticlesQuery, user?: AuthenticatedUser): Promise<Page<Article>> {
    const rows = await articleRepository.list({
      cursor: query.cursor ? decodeCursor(query.cursor) : undefined,
      limit: query.limit,
      // Whatever status a non-admin asks for, they get published articles only.
      status: canSeeDrafts(user) ? query.status : 'PUBLISHED',
      category: query.category,
      q: query.q,
    });
    return toPage(rows, query.limit, toArticle, (doc) => String(doc._id));
  },

  async get(id: string, user?: AuthenticatedUser): Promise<Article> {
    const article = await articleRepository.findById(id);
    // Drafts are reported as missing (not forbidden) so their existence is not disclosed.
    if (!article || (article.status !== 'PUBLISHED' && !canSeeDrafts(user))) throw Errors.notFound('Article not found');
    return article;
  },

  podcasts(): Promise<PodcastSummary[]> {
    return articleRepository.podcasts();
  },

  async getDownload(id: string, user: AuthenticatedUser): Promise<ArticleFile> {
    const file = await articleRepository.findFile(id);
    if (!file || (file.status !== 'PUBLISHED' && !canSeeDrafts(user))) throw Errors.notFound('Article not found');
    return file;
  },

  async update(id: string, input: UpdateArticleInput): Promise<Article> {
    const article = await articleRepository.update(id, {
      ...input,
      ...(input.content === undefined ? {} : { readingMinutes: readingMinutes(input.content) }),
    });
    if (!article) throw Errors.notFound('Article not found');
    return article;
  },

  async remove(id: string): Promise<void> {
    const fileKey = await articleRepository.delete(id);
    if (!fileKey) throw Errors.notFound('Article not found');
    await articleStorage.remove(fileKey);
  },
};
