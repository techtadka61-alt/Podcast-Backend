import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { ok, requireUser } from '../../shared/http';
import { objectIdSchema } from '../../shared/object-id';
import { Permission, Role } from '../../shared/rbac';
import { usersService } from './users.service';

const listQuerySchema = z.object({
  cursor: z.string().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const idParamSchema = z.object({ id: objectIdSchema });

const updateSchema = z
  .object({
    role: z.enum([Role.ADMIN, Role.USER]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');

export function createAdminUsersRouter(): Router {
  const router = Router();

  router.use(authenticate);

  router.get('/', authorize(Permission.USER_READ), async (req: Request, res: Response) => {
    ok(res, await usersService.list(listQuerySchema.parse(req.query)));
  });

  router.patch('/:id', authorize(Permission.USER_MANAGE), async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const user = await usersService.update(requireUser(req).id, id, updateSchema.parse(req.body));
    ok(res, { user });
  });

  return router;
}
