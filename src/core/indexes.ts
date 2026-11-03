import { ArticleModel } from '../modules/articles/article.model';
import { RefreshTokenModel } from '../modules/auth/refresh-token.model';
import { UserModel } from '../modules/users/user.model';

/** Builds every index declared on the schemas. Safe to run repeatedly. */
export async function ensureIndexes(): Promise<void> {
  await Promise.all([UserModel.createIndexes(), RefreshTokenModel.createIndexes(), ArticleModel.createIndexes()]);
}
