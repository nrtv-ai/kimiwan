import { A2ACoop } from './index';

/**
 * Example usage of A2A-Coop
 * 
 * This demonstrates the core functionality:
 * 1. Creating agents with different capabilities
 * 2. Creating a shared context
 * 3. Creating and assigning tasks
 * 4. Agents communicating via messages
 * 5. Completing tasks with results
 */
async function main() {
  console.log('🚀 A2A-Coop Demo\n');

  // Initialize the system
  const coop = new A2ACoop();

  // ==================== Step 1: Register Agents ====================
  console.log('📋 Registering Agents...\n');

  const researchAgent = coop.registerAgent({
    name: 'ResearchBot',
    description: 'Gathers and analyzes information',
    capabilities: ['research', 'analyze', 'summarize'],
  });
  console.log(`  ✓ ${researchAgent.name} (${researchAgent.id.slice(0, 8)}...)`);

  const writerAgent = coop.registerAgent({
    name: 'WriterBot',
    description: 'Creates written content',
    capabilities: ['write', 'edit', 'format'],
  });
  console.log(`  ✓ ${writerAgent.name} (${writerAgent.id.slice(0, 8)}...)`);

  const reviewAgent = coop.registerAgent({
    name: 'ReviewBot',
    description: 'Reviews and provides feedback',
    capabilities: ['review', 'critique', 'suggest'],
  });
  console.log(`  ✓ ${reviewAgent.name} (${reviewAgent.id.slice(0, 8)}...)`);

  // ==================== Step 2: Create Shared Context ====================
  console.log('\n📁 Creating Shared Context...\n');

  const projectContext = coop.createContext(
    {
      name: 'Blog Post Project',
      description: 'Collaborative blog post about AI trends',
      initialData: {
        topic: 'AI Collaboration Systems',
        targetAudience: 'Technical readers',
        wordCount: 1500,
      },
    },
    researchAgent.id
  );
  console.log(`  ✓ Context: ${projectContext.name} (${projectContext.id.slice(0, 8)}...)`);

  // Add all agents to the context
  coop.context.addParticipant(projectContext.id, writerAgent.id);
  coop.context.addParticipant(projectContext.id, reviewAgent.id);
  console.log(`  ✓ Added ${projectContext.participants.length} participants`);

  // ==================== Step 3: Set up Message Subscriptions ====================
  console.log('\n📨 Setting up Message Handlers...\n');

  coop.subscribeToMessages(researchAgent.id, (msg) => {
    console.log(`  📩 ResearchBot received: ${msg.type} from ${msg.from.slice(0, 8)}...`);
  });

  coop.subscribeToMessages(writerAgent.id, (msg) => {
    console.log(`  📩 WriterBot received: ${msg.type} from ${msg.from.slice(0, 8)}...`);
  });

  coop.subscribeToMessages(reviewAgent.id, (msg) => {
    console.log(`  📩 ReviewBot received: ${msg.type} from ${msg.from.slice(0, 8)}...`);
  });

  // ==================== Step 4: Create and Execute Workflow ====================
  console.log('\n🔄 Executing Collaborative Workflow...\n');

  // Task 1: Research
  const researchTask = coop.createTask(
    {
      type: 'research',
      description: 'Research latest AI collaboration trends',
      payload: { focus: 'multi-agent systems' },
      contextId: projectContext.id,
      requiredCapabilities: ['research', 'analyze'],
    },
    researchAgent.id
  );
  console.log(`  1. Created task: ${researchTask.description}`);
  console.log(`     Assigned to: ${researchTask.assignedTo === researchAgent.id ? 'ResearchBot' : 'Unknown'}`);

  // Simulate task execution
  coop.startTask(researchTask.id);
  console.log(`     Status: Started`);

  // Store research results in context
  coop.updateContext(
    projectContext.id,
    {
      research: {
        findings: ['Trend 1: Agent orchestration', 'Trend 2: Context sharing', 'Trend 3: Task delegation'],
        sources: ['arxiv.org', 'research.google'],
      },
    },
    researchAgent.id
  );

  coop.completeTask(researchTask.id, {
    success: true,
    data: { findingsCount: 3 },
    logs: ['Researched 5 sources', 'Identified 3 key trends'],
  });
  console.log(`     Status: Completed ✓\n`);

  // Task 2: Write (depends on research)
  const writeTask = coop.createTask(
    {
      type: 'write',
      description: 'Write blog post draft',
      payload: { style: 'technical', tone: 'informative' },
      contextId: projectContext.id,
      requiredCapabilities: ['write'],
    },
    writerAgent.id
  );
  console.log(`  2. Created task: ${writeTask.description}`);
  console.log(`     Assigned to: ${writeTask.assignedTo === writerAgent.id ? 'WriterBot' : 'Unknown'}`);

  coop.startTask(writeTask.id);
  console.log(`     Status: Started`);

  // Writer sends message to researcher for clarification
  coop.sendMessage(
    writerAgent.id,
    researchAgent.id,
    'Can you provide more details on Trend 2?'
  );

  // Researcher responds
  coop.sendMessage(
    researchAgent.id,
    writerAgent.id,
    'Trend 2 refers to shared context systems like A2A-Coop that enable stateful collaboration.',
    { relevantFinding: 'context-sharing' }
  );

  coop.completeTask(writeTask.id, {
    success: true,
    data: { wordCount: 1450, sections: 5 },
    logs: ['Draft written', 'Incorporated research findings'],
    artifacts: [
      { type: 'document', name: 'blog-draft.md', content: '# AI Collaboration Systems\n\nDraft content...' },
    ],
  });
  console.log(`     Status: Completed ✓\n`);

  // Task 3: Review
  const reviewTask = coop.createTask(
    {
      type: 'review',
      description: 'Review and provide feedback on draft',
      payload: { criteria: ['accuracy', 'clarity', 'engagement'] },
      contextId: projectContext.id,
      requiredCapabilities: ['review'],
    },
    reviewAgent.id
  );
  console.log(`  3. Created task: ${reviewTask.description}`);
  console.log(`     Assigned to: ${reviewTask.assignedTo === reviewAgent.id ? 'ReviewBot' : 'Unknown'}`);

  coop.startTask(reviewTask.id);
  console.log(`     Status: Started`);

  // Broadcast feedback to all participants
  coop.broadcastMessage(reviewAgent.id, 'review_complete', {
    score: 8.5,
    suggestions: ['Add more examples', 'Simplify technical jargon'],
  });

  coop.completeTask(reviewTask.id, {
    success: true,
    data: { score: 8.5, approved: true },
    logs: ['Reviewed draft', 'Provided 2 suggestions'],
  });
  console.log(`     Status: Completed ✓\n`);

  // ==================== Step 5: Summary ====================
  console.log('📊 Final Status:\n');

  const status = coop.getStatus();
  console.log(`  Agents: ${status.agents}`);
  console.log(`  Tasks: ${status.tasks.total} total`);
  console.log(`    - Pending: ${status.tasks.pending}`);
  console.log(`    - In Progress: ${status.tasks.inProgress}`);
  console.log(`    - Completed: ${status.tasks.completed}`);
  console.log(`  Contexts: ${status.contexts}`);
  console.log(`  Messages: ${status.messages}`);

  console.log('\n  Context Data:');
  const finalContext = coop.getContext(projectContext.id);
  console.log(`    ${JSON.stringify(finalContext?.data, null, 4).split('\n').join('\n    ')}`);

  console.log('\n  Task Results:');
  for (const task of coop.getAllTasks()) {
    console.log(`    - ${task.description}: ${task.status}`);
    if (task.result) {
      console.log(`      Result: ${JSON.stringify(task.result.data)}`);
    }
  }

  console.log('\n✅ Demo Complete!');
}

// Run the demo
main().catch(console.error);
