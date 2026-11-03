import type { Request, Response } from 'express';
import { Errors } from '../../core/errors';
import { noContent, ok, requireUser } from '../../shared/http';
import { articleStorage, articlesDir } from './article.storage';
import {
  articleIdParamSchema,
  createArticleSchema,
  listArticlesQuerySchema,
  updateArticleSchema,
} from './article.schema';
import { articleService } from './article.service';

export const articleController = {
  async create(req: Request, res: Response): Promise<void> {
    const file = req.file;
    try {
      const input = createArticleSchema.parse(req.body);
      if (!file) throw Errors.badRequest('A PDF file is required', { file: 'A PDF file is required' });

      const article = await articleService.create(
        input,
        { tmpPath: file.path, originalName: file.originalname, size: file.size },
        requireUser(req),
      );
      ok(res, { article }, 201);
    } catch (err) {
      // Validation failed before the service took ownership of the temp file.
      if (file) await articleStorage.discardTemp(file.path);
      throw err;
    }
  },

  /** Public. Anonymous callers get published articles; admins (signed in) can also see drafts. */
  async list(req: Request, res: Response): Promise<void> {
    ok(res, await articleService.list(listArticlesQuerySchema.parse(req.query), req.user));
  },

  async get(req: Request, res: Response): Promise<void> {
    const { id } = articleIdParamSchema.parse(req.params);
    ok(res, { article: await articleService.get(id, req.user) });
  },

  async podcasts(_req: Request, res: Response): Promise<void> {
    ok(res, { podcasts: await articleService.podcasts() });
  },

  async download(req: Request, res: Response): Promise<void> {
    const { id } = articleIdParamSchema.parse(req.params);
    const file = await articleService.getDownload(id, requireUser(req));

    res.attachment(`${file.title}.pdf`); // sets Content-Disposition (RFC 6266 encoded) and Content-Type
    res.setHeader('Cache-Control', 'private, max-age=300');

    // `root` + a server-generated key means the path can never escape the uploads folder.
    await new Promise<void>((resolve, reject) => {
      res.sendFile(file.fileKey, { root: articlesDir, dotfiles: 'deny', cacheControl: false }, (err) =>
        err ? reject(err) : resolve(),
      );
    });
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = articleIdParamSchema.parse(req.params);
    ok(res, { article: await articleService.update(id, updateArticleSchema.parse(req.body)) });
  },

  async remove(req: Request, res: Response): Promise<void> {
    const { id } = articleIdParamSchema.parse(req.params);
    await articleService.remove(id);
    noContent(res);
  },
};
