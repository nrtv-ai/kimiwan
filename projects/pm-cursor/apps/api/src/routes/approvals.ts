import { Router } from 'express';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db, agentActions, tasks, activities } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

type ActionResultShape = {
  metadata?: {
    taskIds?: string[];
  };
};

// GET /api/v1/approvals - list approval items
router.get('/', async (req, res, next) => {
  try {
    const { status, projectId } = req.query as { status?: string; projectId?: string };

    const whereConditions: any[] = [];
    if (status) whereConditions.push(eq(agentActions.status, status as any));
    if (projectId) whereConditions.push(eq(agentActions.projectId, projectId));

    const result = await db
      .select()
      .from(agentActions)
      .where(whereConditions.length ? and(...whereConditions) : undefined)
      .orderBy(desc(agentActions.createdAt))
      .limit(100);

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/approvals/:id/approve - approve an applied action
router.post('/:id/approve', async (req, res, next) => {
  try {
    const approverId = req.user?.id;
    if (!approverId) {
      throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
    }

    const [action] = await db
      .update(agentActions)
      .set({
        status: 'approved',
        approvedBy: approverId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agentActions.id, req.params.id))
      .returning();

    if (!action) {
      throw new AppError(404, 'Approval item not found', 'NOT_FOUND');
    }

    await db.insert(activities).values({
      actorId: approverId,
      actorType: 'user',
      action: 'agent_action.approved',
      entityType: 'agent_action',
      entityId: action.id,
      projectId: action.projectId,
      metadata: { actionType: action.actionType },
    });

    res.json({ data: action });
  } catch (error) {
    next(error);
  }
});

async function rollbackAction(actionId: string, rollbackActorId: string) {
  const action = await db.query.agentActions.findFirst({
    where: eq(agentActions.id, actionId),
  });

  if (!action) {
    throw new AppError(404, 'Approval item not found', 'NOT_FOUND');
  }

  // Skeleton rollback hook: task breakdown rolls back created tasks.
  if (action.actionType === 'breakdown') {
    const resultData = (action.result || {}) as ActionResultShape;
    const taskIds = resultData?.metadata?.taskIds || [];
    if (taskIds.length > 0) {
      await db.delete(tasks).where(inArray(tasks.id, taskIds));
    }
  }

  const [rolledBackAction] = await db
    .update(agentActions)
    .set({
      status: 'rolled_back',
      rolledBackBy: rollbackActorId,
      rolledBackAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(agentActions.id, actionId))
    .returning();

  await db.insert(activities).values({
    actorId: rollbackActorId,
    actorType: 'user',
    action: 'agent_action.rolled_back',
    entityType: 'agent_action',
    entityId: action.id,
    projectId: action.projectId,
    metadata: { actionType: action.actionType },
  });

  return rolledBackAction;
}

// POST /api/v1/approvals/:id/rollback - rollback an already-applied action
router.post('/:id/rollback', async (req, res, next) => {
  try {
    const rollbackActorId = req.user?.id;
    if (!rollbackActorId) {
      throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
    }

    const action = await rollbackAction(req.params.id, rollbackActorId);
    res.json({ data: action });
  } catch (error) {
    next(error);
  }
});

export { router as approvalRoutes };
