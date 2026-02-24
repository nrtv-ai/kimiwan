import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, agents, NewAgent } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';

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
  try {
    const { action, context } = req.body;
    
    const agent = await db.query.agents.findFirst({
      where: (agents, { eq }) => eq(agents.id, req.params.id),
    });
    
    if (!agent) {
      throw new AppError(404, 'Agent not found', 'NOT_FOUND');
    }
    
    // TODO: Implement actual agent execution with LLM
    // This is a placeholder for the AI integration
    
    res.json({ 
      data: {
        agentId: agent.id,
        action,
        result: 'Agent execution placeholder - AI integration pending',
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as agentRoutes };
