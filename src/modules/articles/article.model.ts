import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { ARTICLE_CATEGORIES } from './article.constants';

export const ARTICLE_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

const articleSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },
    summary: { type: String, default: '', trim: true, maxlength: 2000 },
    // The written article shown on the website (plain text with "## " sub-headings). The PDF is the download.
    content: { type: String, default: '', trim: true, maxlength: 60_000 },

    // Where the ideas came from. Every article credits and links the original episode.
    podcastName: { type: String, required: true, trim: true, maxlength: 120 },
    host: { type: String, required: true, trim: true, maxlength: 120 },
    guest: { type: String, default: '', trim: true, maxlength: 120 },
    sourceUrl: { type: String, default: '', trim: true, maxlength: 500 },

    category: { type: String, enum: ARTICLE_CATEGORIES, default: 'Other', required: true },
    tags: { type: [String], default: [] },
    readingMinutes: { type: Number, default: 1, min: 1 },

    // Server generated object key inside the upload directory. Never exposed to clients.
    fileKey: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true, min: 1 },

    status: { type: String, enum: ARTICLE_STATUSES, default: 'DRAFT', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

articleSchema.index({ fileKey: 1 }, { unique: true });
// The feed: newest first, filtered by status (and category), paginated on _id.
articleSchema.index({ status: 1, _id: -1 });
articleSchema.index({ status: 1, category: 1, _id: -1 });
// Search box. `none` disables English stemming, which would mangle names like "Shamani" or "Kamath".
articleSchema.index(
  { title: 'text', podcastName: 'text', host: 'text', guest: 'text', tags: 'text', summary: 'text' },
  {
    name: 'article_text',
    default_language: 'none',
    weights: { title: 10, podcastName: 6, host: 6, guest: 6, tags: 4, summary: 1 },
  },
);

export type ArticleDoc = InferSchemaType<typeof articleSchema> & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date };
export const ArticleModel = model('Article', articleSchema);
