# Unified Product: LoopDoc

## Core Concept

**LoopDoc** - Where documents are conversations and conversations are documents.

Every document is a thread. Every thread is a document. Agents participate in both seamlessly.

## The Merge: Key Insights

### 1. Documents as Conversation Threads
- Each block in a document is a "message" that can have threaded discussions
- Comments aren't sidebars - they're nested replies to blocks
- The document IS the conversation history

### 2. Conversations that Become Living Documents
- Chat threads can be "promoted" to documents
- AI agents help structure messy conversations into organized docs
- Decisions in chat become tasks/checklists in the doc

### 3. Agents Participate in Both Seamlessly
- Agents can edit documents (like suggesting changes)
- Agents can participate in threaded discussions on specific blocks
- Agents can transform chat → doc and doc → chat

## Product Model

```
┌─────────────────────────────────────────────────────────────────┐
│                           LoopDoc                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Document / Thread: "Q1 Roadmap Planning"                │   │
│  │                                                          │   │
│  │  ┌─ Block: Heading "Goals" ──────────────────────────┐  │   │
│  │  │                                                    │  │   │
│  │  │  • Increase revenue by 50%                        │  │   │
│  │  │  • Launch 3 new features                          │  │   │
│  │  │                                                    │  │   │
│  │  │  💬 [3 replies]  👤 @Claude suggested edit...     │  │   │
│  │  │      └─ Thread: "Should we make this 60%?"        │  │   │
│  │  │         ├─ Sarah: Given market conditions...       │  │   │
│  │  │         └─ Claude: Analysis shows...               │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                          │   │
│  │  ┌─ Block: Task List "Action Items" ─────────────────┐  │   │
│  │  │                                                    │  │   │
│  │  │  ☐ Research competitor pricing                    │  │   │
│  │  │  ☐ Design mockups for Feature A                   │  │   │
│  │  │  ☑ Write technical spec                           │  │   │
│  │  │     └─ Completed by CodeBot 2 hours ago           │  │   │
│  │  │                                                    │  │   │
│  │  │  💬 [1 reply]                                     │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                          │   │
│  │  ┌─ Block: Discussion "Open Questions" ──────────────┐  │   │
│  │  │                                                    │  │   │
│  │  │  This is an open chat block where the team        │  │   │
│  │  │  can discuss freely. It won't affect the doc      │  │   │
│  │  │  structure unless promoted.                       │  │   │
│  │  │                                                    │  │   │
│  │  │  Sarah: What about international markets?         │  │   │
│  │  │  Alex: Good point, we should research that        │  │   │
│  │  │  Claude: I can compile a market analysis...       │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Input Area ─────────────────────────────────────────────┐  │
│  │  [Add block...]  [💬 Start discussion]  [@ Mention agent] │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Threaded Block Discussions
- Every block can have threaded replies
- Replies can include other blocks (nested structure)
- Agents participate in threads with suggestions

### 2. Chat Mode / Doc Mode Toggle
- **Doc Mode**: Traditional block-based editor
- **Chat Mode**: Linear conversation view of the same content
- **Hybrid Mode**: Blocks with inline discussions visible

### 3. Agent Participation Patterns

| Context | Agent Action |
|---------|--------------|
| On block edit | Suggest improvements, fix grammar, expand ideas |
| In thread | Answer questions, provide context, debate |
| On @mention | Respond with expertise, execute tasks |
| On promotion | Transform chat → structured doc |

### 4. Promotion/Demotion
- **Promote**: Chat thread → Document block
- **Demote**: Document block → Chat discussion
- **Extract**: Discussion thread → Standalone doc

### 5. Living Documents
- Documents update as conversations evolve
- AI summaries of long discussions
- Auto-extraction of action items
- Version history as conversation timeline

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        LoopDoc Architecture                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │   Client    │◄──►│   WebSocket │◄──►│   Document Engine   │ │
│  │  (Unified)  │    │   Server    │    │  (Blocks + Threads) │ │
│  └─────────────┘    └─────────────┘    └──────────┬──────────┘ │
│         │                                         │            │
│         │         ┌───────────────────────────────┘            │
│         │         │                                            │
│         ▼         ▼                                            │
│  ┌─────────────────────────────────┐                           │
│  │      Unified Data Model         │                           │
│  │  ┌─────────┐    ┌────────────┐ │                           │
│  │  │  Block  │◄──►│   Thread   │ │                           │
│  │  │ (Doc)   │    │  (Chat)    │ │                           │
│  │  └────┬────┘    └─────┬──────┘ │                           │
│  │       │               │        │                           │
│  │       └───────┬───────┘        │                           │
│  │               ▼                │                           │
│  │  ┌─────────────────────────┐   │                           │
│  │  │   Message / Content     │   │                           │
│  │  │  (The atomic unit)      │   │                           │
│  │  └─────────────────────────┘   │                           │
│  └─────────────────────────────────┘                           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Agent Engine                          │   │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐  │   │
│  │  │  Edit   │  │ Discuss  │  │ Summarize│  │ Transform│  │   │
│  │  │  Agent  │  │  Agent   │  │  Agent   │  │  Agent   │  │   │
│  │  └─────────┘  └──────────┘  └─────────┘  └──────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Model

```typescript
// A Block is both a document unit AND a message
interface Block {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'task' | 'code' | 'discussion';
  content: string;
  author: User | Agent;
  createdAt: Date;
  updatedAt: Date;
  
  // Thread integration
  threadId?: string;  // Associated discussion thread
  parentBlockId?: string;  // For nested blocks
  
  // Document structure
  order: number;
  children?: Block[];
  
  // Chat properties
  replies?: Message[];
  replyCount: number;
}

// A Thread is a conversation that can be viewed as chat or doc
interface Thread {
  id: string;
  title: string;
  type: 'document' | 'discussion' | 'hybrid';
  blocks: Block[];
  participants: (User | Agent)[];
  createdAt: Date;
  updatedAt: Date;
  
  // View state
  currentView: 'doc' | 'chat' | 'hybrid';
}

// Messages are replies to blocks (the chat layer)
interface Message {
  id: string;
  blockId: string;  // Which block this replies to
  threadId: string;
  content: string;
  author: User | Agent;
  timestamp: Date;
  
  // Can be promoted to a block
  promotedToBlockId?: string;
}
```

## User Flows

### Flow 1: Document with Threaded Discussions
1. User creates a document with blocks
2. Team discusses specific blocks in threads
3. Agent suggests edits based on discussions
4. Decisions are captured as task blocks

### Flow 2: Chat → Document
1. Team has free-form discussion in chat mode
2. Agent identifies key points and structure
3. User clicks "Promote to Document"
4. Chat becomes structured doc with discussion threads attached

### Flow 3: Agent Collaboration
1. User @mentions agent in a block thread
2. Agent responds with analysis/suggestions
3. Agent can propose block edits
4. User accepts/rejects/modifies

### Flow 4: Living Meeting Notes
1. Meeting starts in chat mode (real-time transcript)
2. Agent structures notes in real-time
3. Action items extracted as task blocks
4. Post-meeting: doc is reference, threads for follow-up

## Why This Wins

1. **No context switching** - Chat and docs are the same thing
2. **Natural workflow** - Discuss, decide, document in one place
3. **AI-native** - Agents understand both modes seamlessly
4. **Flexible** - Start messy (chat), end structured (doc), or stay hybrid
5. **Transparent** - Discussion history is part of the document

## Next Steps

Build a prototype demonstrating:
1. Block-based editor with threaded discussions
2. Doc/Chat mode toggle
3. Agent participation in both modes
4. Promotion from chat → doc
