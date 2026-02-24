import OpenAI from 'openai';
import { db, tasks, NewTask, agents, activities } from '../db/index.js';
import { eq } from 'drizzle-orm';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AgentExecutionContext {
  projectId: string;
  prompt?: string;
  tasks?: any[];
}

export interface AgentExecutionResult {
  success: boolean;
  action: string;
  result: string;
  tasksCreated?: number;
  metadata?: Record<string, any>;
}

/**
 * Execute an AI agent action
 */
export async function executeAgentAction(
  agentId: string,
  action: string,
  context: AgentExecutionContext
): Promise<AgentExecutionResult> {
  // Get agent configuration
  const agent = await db.query.agents.findFirst({
    where: (agents, { eq }) => eq(agents.id, agentId),
  });

  if (!agent) {
    throw new Error('Agent not found');
  }

  if (agent.status !== 'active') {
    throw new Error('Agent is not active');
  }

  // Execute based on action type
  switch (action) {
    case 'breakdown':
      return executeTaskBreakdown(agent, context);
    case 'status':
      return executeStatusSummary(agent, context);
    case 'risks':
      return executeRiskAnalysis(agent, context);
    default:
      return executeGenericAction(agent, action, context);
  }
}

/**
 * Break down a project or goal into tasks
 */
async function executeTaskBreakdown(
  agent: any,
  context: AgentExecutionContext
): Promise<AgentExecutionResult> {
  const systemPrompt = agent.prompts?.system || 
    'You are a project management AI assistant. Break down the given work into specific, actionable tasks.';

  const userPrompt = context.prompt || 
    `Break down the project work into specific tasks. ${context.tasks ? `Current tasks: ${context.tasks.length}` : 'No existing tasks.'}`;

  try {
    const response = await openai.chat.completions.create({
      model: agent.config?.model || 'gpt-4o-mini',
      temperature: agent.config?.temperature || 0.7,
      max_tokens: agent.config?.maxTokens || 2000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      functions: [
        {
          name: 'create_tasks',
          description: 'Create multiple tasks for the project',
          parameters: {
            type: 'object',
            properties: {
              tasks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Task title' },
                    description: { type: 'string', description: 'Detailed task description' },
                    priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                    estimatedHours: { type: 'number', description: 'Estimated hours to complete' },
                  },
                  required: ['title'],
                },
              },
            },
            required: ['tasks'],
          },
        },
      ],
      function_call: { name: 'create_tasks' },
    });

    const functionCall = response.choices[0].message.function_call;
    
    if (functionCall && functionCall.arguments) {
      const parsed = JSON.parse(functionCall.arguments);
      const createdTasks = [];

      // Create tasks in database
      for (const taskData of parsed.tasks) {
        const newTask: NewTask = {
          projectId: context.projectId,
          title: taskData.title,
          description: taskData.description || null,
          status: 'backlog',
          priority: taskData.priority || 'medium',
          creatorId: agent.id, // AI agent is the creator
          assigneeId: null,
          aiGenerated: true,
          aiConfidence: 0.85,
          estimatedHours: taskData.estimatedHours || null,
          labels: [],
          metadata: {
            source: 'ai_breakdown',
            agentId: agent.id,
          },
        };

        const [created] = await db.insert(tasks).values(newTask).returning();
        createdTasks.push(created);

        // Log activity
        await db.insert(activities).values({
          actorId: agent.id,
          actorType: 'agent',
          action: 'task.created',
          entityType: 'task',
          entityId: created.id,
          projectId: context.projectId,
          metadata: {
            aiGenerated: true,
            title: taskData.title,
          },
        });
      }

      // Update agent metrics
      await db.update(agents)
        .set({
          metrics: {
            ...agent.metrics,
            tasksCreated: (agent.metrics?.tasksCreated || 0) + createdTasks.length,
            lastActiveAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(agents.id, agent.id));

      return {
        success: true,
        action: 'breakdown',
        result: `Created ${createdTasks.length} tasks based on AI analysis`,
        tasksCreated: createdTasks.length,
        metadata: { taskIds: createdTasks.map(t => t.id) },
      };
    }

    return {
      success: true,
      action: 'breakdown',
      result: 'Analysis complete but no tasks were created',
    };
  } catch (error) {
    console.error('Task breakdown error:', error);
    throw new Error(`Failed to execute task breakdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a status summary for the project
 */
async function executeStatusSummary(
  agent: any,
  context: AgentExecutionContext
): Promise<AgentExecutionResult> {
  const systemPrompt = agent.prompts?.system || 
    'You are a project management AI assistant. Provide concise, actionable status summaries.';

  const taskSummary = context.tasks?.map(t => 
    `- ${t.title} (${t.status}, ${t.priority} priority)`
  ).join('\n') || 'No tasks available';

  const userPrompt = `Provide a brief status summary for this project based on the following tasks:\n\n${taskSummary}\n\n${context.prompt || ''}`;

  try {
    const response = await openai.chat.completions.create({
      model: agent.config?.model || 'gpt-4o-mini',
      temperature: 0.5,
      max_tokens: 1000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const summary = response.choices[0].message.content || 'No summary generated';

    // Log activity
    await db.insert(activities).values({
      actorId: agent.id,
      actorType: 'agent',
      action: 'project.status_summary',
      entityType: 'project',
      entityId: context.projectId,
      projectId: context.projectId,
      metadata: { summary },
    });

    return {
      success: true,
      action: 'status',
      result: summary,
    };
  } catch (error) {
    console.error('Status summary error:', error);
    throw new Error(`Failed to generate status summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Analyze project risks
 */
async function executeRiskAnalysis(
  agent: any,
  context: AgentExecutionContext
): Promise<AgentExecutionResult> {
  const systemPrompt = agent.prompts?.system || 
    'You are a project management AI assistant. Identify potential risks and provide mitigation strategies.';

  const taskSummary = context.tasks?.map(t => 
    `- ${t.title} (${t.status}, ${t.priority} priority)`
  ).join('\n') || 'No tasks available';

  const userPrompt = `Analyze this project for potential risks based on the following tasks:\n\n${taskSummary}\n\n${context.prompt || ''}`;

  try {
    const response = await openai.chat.completions.create({
      model: agent.config?.model || 'gpt-4o-mini',
      temperature: 0.5,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      functions: [
        {
          name: 'report_risks',
          description: 'Report identified risks',
          parameters: {
            type: 'object',
            properties: {
              risks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    description: { type: 'string' },
                    severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                    mitigation: { type: 'string' },
                  },
                  required: ['description', 'severity'],
                },
              },
            },
            required: ['risks'],
          },
        },
      ],
      function_call: { name: 'report_risks' },
    });

    const functionCall = response.choices[0].message.function_call;
    let risks = [];

    if (functionCall && functionCall.arguments) {
      const parsed = JSON.parse(functionCall.arguments);
      risks = parsed.risks || [];
    }

    // Log activity
    await db.insert(activities).values({
      actorId: agent.id,
      actorType: 'agent',
      action: 'project.risk_analysis',
      entityType: 'project',
      entityId: context.projectId,
      projectId: context.projectId,
      metadata: { riskCount: risks.length, risks },
    });

    return {
      success: true,
      action: 'risks',
      result: `Identified ${risks.length} potential risks`,
      metadata: { risks },
    };
  } catch (error) {
    console.error('Risk analysis error:', error);
    throw new Error(`Failed to analyze risks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse natural language task input into structured task data
 */
export interface ParsedTaskInput {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
  dueDate?: string;
  estimatedHours?: number;
  labels?: string[];
  assigneeHint?: string;
}

export async function parseNaturalLanguageTask(
  input: string,
  projectContext?: { projectName?: string; existingLabels?: string[] }
): Promise<ParsedTaskInput> {
  const systemPrompt = `You are a task parsing assistant. Extract structured task information from natural language input.
  Parse dates relative to today (${new Date().toISOString().split('T')[0]}).
  Return only valid JSON matching the expected format.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 1000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Parse this task description into structured data: "${input}"` },
      ],
      functions: [
        {
          name: 'parse_task',
          description: 'Parse natural language task description into structured data',
          parameters: {
            type: 'object',
            properties: {
              title: { 
                type: 'string', 
                description: 'Clear, concise task title (max 100 chars)' 
              },
              description: { 
                type: 'string', 
                description: 'Detailed description if provided, null if not' 
              },
              priority: { 
                type: 'string', 
                enum: ['low', 'medium', 'high', 'urgent'],
                description: 'Priority based on urgency words (ASAP, urgent, critical = urgent/ high; soon, important = high; normal = medium; whenever, low priority = low)'
              },
              status: {
                type: 'string',
                enum: ['backlog', 'todo', 'in_progress'],
                description: 'Status based on action words (start working, begin = in_progress; need to, should do = todo; maybe, consider = backlog)'
              },
              dueDate: { 
                type: 'string', 
                description: 'Due date in ISO 8601 format (YYYY-MM-DD) if mentioned, null if not. Parse relative dates like "tomorrow", "next week", "in 3 days"'
              },
              estimatedHours: { 
                type: 'number', 
                description: 'Estimated hours if mentioned (e.g., "2 hours", "half day" = 4), null if not specified'
              },
              labels: {
                type: 'array',
                items: { type: 'string' },
                description: 'Relevant labels/tags extracted from the text (e.g., bug, feature, design, docs)'
              },
              assigneeHint: {
                type: 'string',
                description: 'Name or role mentioned for assignment (e.g., "John", "the designer", "backend team"), null if not specified'
              }
            },
            required: ['title'],
          },
        },
      ],
      function_call: { name: 'parse_task' },
    });

    const functionCall = response.choices[0].message.function_call;
    
    if (functionCall && functionCall.arguments) {
      const parsed = JSON.parse(functionCall.arguments);
      return {
        title: parsed.title,
        description: parsed.description,
        priority: parsed.priority || 'medium',
        status: parsed.status || 'backlog',
        dueDate: parsed.dueDate,
        estimatedHours: parsed.estimatedHours,
        labels: parsed.labels || [],
        assigneeHint: parsed.assigneeHint,
      };
    }

    // Fallback: use input as title
    return { title: input };
  } catch (error) {
    console.error('Natural language parsing error:', error);
    // Return basic fallback
    return { title: input };
  }
}

/**
 * Execute a generic agent action
 */
async function executeGenericAction(
  agent: any,
  action: string,
  context: AgentExecutionContext
): Promise<AgentExecutionResult> {
  const systemPrompt = agent.prompts?.system || 
    'You are a helpful project management AI assistant.';

  const userPrompt = `Action: ${action}\n\nContext: ${context.prompt || 'No additional context provided'}`;

  try {
    const response = await openai.chat.completions.create({
      model: agent.config?.model || 'gpt-4o-mini',
      temperature: agent.config?.temperature || 0.7,
      max_tokens: agent.config?.maxTokens || 2000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const result = response.choices[0].message.content || 'No response generated';

    return {
      success: true,
      action,
      result,
    };
  } catch (error) {
    console.error('Generic action error:', error);
    throw new Error(`Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
