import { isValidObjectId } from 'mongoose';
import type { ArticleCategory } from './article.constants';
import { ArticleModel, type ArticleDoc, type ArticleStatus } from './article.model';

export interface Article {
  id: string;
  title: string;
  summary: string;
  /** Only present on the detail view; list responses leave it out to stay small. */
  content?: string;
  podcastName: string;
  host: string;
  guest: string;
  sourceUrl: string;
  category: ArticleCategory;
  tags: string[];
  readingMinutes: number;
  fileName: string;
  fileSize: number;
  status: ArticleStatus;
  createdAt: string;
  publishedAt: string | null;
}

/** Internal view that includes the storage key; never serialised to clients. */
export interface ArticleFile {
  fileKey: string;
  title: string;
  status: ArticleStatus;
}

export interface PodcastSummary {
  podcastName: string;
  host: string;
  articles: number;
}

export interface NewArticle {
  title: string;
  summary: string;
  content: string;
  podcastName: string;
  host: string;
  guest: string;
  sourceUrl: string;
  category: ArticleCategory;
  tags: string[];
  readingMinutes: number;
  status: ArticleStatus;
  fileKey: string;
  fileName: string;
  fileSize: number;
  createdBy: string;
}

export type ArticlePatch = Partial<Omit<NewArticle, 'fileKey' | 'fileName' | 'fileSize' | 'createdBy'>>;

// The storage key and internal fields never leave the server.
const HIDDEN = '-fileKey -createdBy -updatedAt -__v';

export const toArticle = (doc: ArticleDoc): Article => ({
  id: String(doc._id),
  title: doc.title,
  summary: doc.summary,
  ...(doc.content === undefined ? {} : { content: doc.content }),
  podcastName: doc.podcastName,
  host: doc.host,
  guest: doc.guest ?? '',
  sourceUrl: doc.sourceUrl ?? '',
  category: doc.category as ArticleCategory,
  tags: doc.tags ?? [],
  readingMinutes: doc.readingMinutes ?? 1,
  fileName: doc.fileName,
  fileSize: doc.fileSize,
  status: doc.status as ArticleStatus,
  createdAt: doc.createdAt.toISOString(),
  publishedAt: doc.publishedAt?.toISOString() ?? null,
});

export const articleRepository = {
  async insert(input: NewArticle): Promise<Article> {
    const doc = await ArticleModel.create({
      ...input,
      publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
    });
    return toArticle(doc.toObject() as ArticleDoc);
  },

  /** Keyset page, newest first. Returns `limit + 1` documents so the caller can tell if more exist. */
  async list(params: {
    cursor?: string;
    limit: number;
    status?: ArticleStatus;
    category?: ArticleCategory;
    q?: string;
  }): Promise<ArticleDoc[]> {
    const filter: Record<string, unknown> = {};
    if (params.cursor) filter._id = { $lt: params.cursor };
    if (params.status) filter.status = params.status;
    if (params.category) filter.category = params.category;
    if (params.q) filter.$text = { $search: params.q };

    return ArticleModel.find(filter)
      .select(`${HIDDEN} -content`)
      .sort({ _id: -1 })
      .limit(params.limit + 1)
      .lean<ArticleDoc[]>();
  },

  async findById(id: string): Promise<Article | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await ArticleModel.findById(id).select(HIDDEN).lean<ArticleDoc>();
    return doc ? toArticle(doc) : null;
  },

  async findFile(id: string): Promise<ArticleFile | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await ArticleModel.findById(id).select('fileKey title status').lean<ArticleDoc>();
    return doc ? { fileKey: doc.fileKey, title: doc.title, status: doc.status as ArticleStatus } : null;
  },

  /** Published podcasts with their article counts, most covered first. */
  async podcasts(limit = 12): Promise<PodcastSummary[]> {
    const rows = await ArticleModel.aggregate<{ _id: { podcastName: string; host: string }; articles: number }>([
      { $match: { status: 'PUBLISHED' } },
      { $group: { _id: { podcastName: '$podcastName', host: '$host' }, articles: { $sum: 1 } } },
      { $sort: { articles: -1, '_id.podcastName': 1 } },
      { $limit: limit },
    ]);
    return rows.map((row) => ({ podcastName: row._id.podcastName, host: row._id.host, articles: row.articles }));
  },

  async update(id: string, patch: ArticlePatch): Promise<Article | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await ArticleModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true })
      .select(HIDDEN)
      .lean<ArticleDoc>();
    if (!doc) return null;

    // First time an article becomes PUBLISHED, stamp the date (kept on later unpublish/republish).
    if (doc.status === 'PUBLISHED' && !doc.publishedAt) {
      doc.publishedAt = new Date();
      await ArticleModel.updateOne({ _id: id }, { $set: { publishedAt: doc.publishedAt } });
    }
    return toArticle(doc);
  },

  /** Returns the storage key of the deleted document so the caller can remove the file. */
  async delete(id: string): Promise<string | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await ArticleModel.findByIdAndDelete(id).select('fileKey').lean<ArticleDoc>();
    return doc?.fileKey ?? null;
  },
};
