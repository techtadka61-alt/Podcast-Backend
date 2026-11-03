import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { Permission } from '../../shared/rbac';
import { articleController } from './article.controller';
import { uploadPdf } from './article.upload';

export function createArticleRouter(): Router {
  const router = Router();

  // Public: the website is a publication, anyone can read. Sign-in only gates the PDF download.
  // optionalAuthenticate lets a signed-in admin see drafts on the same endpoints.
  router.get('/', optionalAuthenticate, articleController.list);
  router.get('/podcasts', articleController.podcasts); // declared before /:id so "podcasts" is not read as an id
  router.get('/:id', optionalAuthenticate, articleController.get);

  router.get('/:id/download', authenticate, authorize(Permission.ARTICLE_DOWNLOAD), articleController.download);

  // Order matters: authenticate + authorize run BEFORE multer touches the body, so an
  // unauthenticated client can never make the server write a byte to disk.
  router.post('/', authenticate, authorize(Permission.ARTICLE_CREATE), uploadPdf, articleController.create);
  router.patch('/:id', authenticate, authorize(Permission.ARTICLE_UPDATE), articleController.update);
  router.delete('/:id', authenticate, authorize(Permission.ARTICLE_DELETE), articleController.remove);

  return router;
}
