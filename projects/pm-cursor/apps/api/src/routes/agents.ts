import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, agents, agentActions, activities, NewAgent } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { executeAgentAction } from '../services/aiService.js';

const router = Router();

const createAgentSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(['planner', 'executor', 'reviewer', 'custom']).default('custom'),
  config: z.object({
    model: z.string().default('gpt-4o'),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().int().positive().default(2000),
    autoExecute: z.boolean().default(false),
  }).default({}),
  capabilities: z.array(z.object({
    name: z.string(),
    description: z.string(),
    enabled: z.boolean(),
  })).default([]),
});

// GET /api/v1/agents
router.get('/', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    
    let query = db.query.agents.findMany({
      orderBy: (agents, { desc }) => [desc(agents.createdAt)],
    });
    
    const allAgents = await query;
    
    // Filter by project if specified
    const filteredAgents = projectId 
      ? allAgents.filter(a => a.projectId === projectId)
      : allAgents;
    
    res.json({ data: filteredAgents });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/agents/:id
router.get('/:id', async (req, res, next) => {
  try {
    const agent = await db.query.agents.findFirst({
      where: (agents, { eq }) => eq(agents.id, req.params.id),
    });
    
    if (!agent) {
      throw new AppError(404, 'Agent not found', 'NOT_FOUND');
    }
    
    res.json({ data: agent });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/agents
router.post('/', async (req, res, next) => {
  try {
    const data = createAgentSchema.parse(req.body);
    
    const newAgent: NewAgent = {
      projectId: data.projectId,
      name: data.name,
      description: data.description || null,
      type: data.type,
      config: data.config,
      capabilities: data.capabilities,
      prompts: {
        system: `You are ${data.name}, an AI assistant helping with project management tasks.`,
      },
      metrics: {
        tasksCompleted: 0,
        tasksCreated: 0,
        avgResponseTimeMs: 0,
        successRate: 1.0,
        lastActiveAt: null,
      },
    };
    
    const [agent] = await db.insert(agents).values(newAgent).returning();
    
    res.status(201).json({ data: agent });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/agents/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const updateSchema = createAgentSchema.partial();
    const data = updateSchema.parse(req.body);
    
    const [agent] = await db
      .update(agents)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, req.params.id))
      .returning();
    
    if (!agent) {
      throw new AppError(404, 'Agent not found', 'NOT_FOUND');
    }
    
    res.json({ data: agent });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/agents/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [agent] = await db
      .delete(agents)
      .where(eq(agents.id, req.params.id))
      .returning();
    
    if (!agent) {
      throw new AppError(404, 'Agent not found', 'NOT_FOUND');
    }
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/agents/:id/execute - Execute an agent action
router.post('/:id/execute', async (req, res, next) => {
  let pendingActionId: string | null = null;
  try {
    const { action, context } = req.body;
    
    const agent = await db.query.agents.findFirst({
      where: (agents, { eq }) => eq(agents.id, req.params.id),
    });
    
    if (!agent) {
      throw new AppError(404, 'Agent not found', 'NOT_FOUND');
    }

    const projectId = context?.projectId || agent.projectId;
    if (!projectId) {
      throw new AppError(400, 'projectId is required in context or agent', 'BAD_REQUEST');
    }

    const [pendingAction] = await db
      .insert(agentActions)
      .values({
        projectId,
        agentId: agent.id,
        actionType: action,
        status: 'running',
        context: context || {},
      })
      .returning();
    pendingActionId = pendingAction.id;

    const executionContext = {
      ...(context || {}),
      projectId,
      agentActionId: pendingAction.id,
    };
    
    // Execute the agent action using the AI service
    const result = await executeAgentAction(agent.id, action, executionContext);

    const [finalizedAction] = await db
      .update(agentActions)
      .set({
        status: 'applied_pending_approval',
        result,
        rollbackData: {
          taskIds: result.metadata?.taskIds || [],
        },
        updatedAt: new Date(),
      })
      .where(eq(agentActions.id, pendingAction.id))
      .returning();

    await db.insert(activities).values({
      actorId: agent.id,
      actorType: 'agent',
      action: 'agent_action.applied_pending_approval',
      entityType: 'agent_action',
      entityId: finalizedAction.id,
      projectId,
      metadata: {
        actionType: action,
      },
    });
    
    res.json({ 
      data: {
        agentId: agent.id,
        approvalItemId: finalizedAction.id,
        approvalStatus: finalizedAction.status,
        action: result.action,
        success: result.success,
        result: result.result,
        tasksCreated: result.tasksCreated,
        metadata: result.metadata,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    if (pendingActionId) {
      await db
        .update(agentActions)
        .set({
          status: 'failed',
          result: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          updatedAt: new Date(),
        })
        .where(eq(agentActions.id, pendingActionId));
    }
    next(error);
  }
});

export { router as agentRoutes };
