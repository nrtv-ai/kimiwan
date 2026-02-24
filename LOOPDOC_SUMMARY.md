# LoopDoc: Unified Product Summary

## The Merge: Documents ARE Conversations

After deep research, I realized the dichotomy between "Notion alternative" and "AI messenger" is artificial. The unified product is:

**LoopDoc** - Where documents are conversations and conversations are documents.

## Core Insight

The future isn't documents OR chat. It's both simultaneously:

```
Traditional View:                    LoopDoc View:
┌─────────────┐                     ┌─────────────────────┐
│ Document    │                     │ Unified Workspace   │
│ (Static)    │                     │ (Fluid)             │
├─────────────┤                     ├─────────────────────┤
│ Comments →  │                     │ Blocks with threads │
│ Sidebar     │                     │ (same thing!)       │
└─────────────┘                     └─────────────────────┘
                                    
┌─────────────┐                     ┌─────────────────────┐
│ Chat        │                     │ Same blocks,        │
│ (Ephemeral) │                     │ different view      │
├─────────────┤                     ├─────────────────────┤
│ Scrolly →   │                     │ Toggle: Doc/Chat/   │
│ Lost        │                     │ Hybrid              │
└─────────────┘                     └─────────────────────┘
```

## How It Works

### 1. Every Block Has a Thread
- A heading, paragraph, or task IS a message
- It can have threaded replies (discussions)
- Discussions are part of the document, not sidebars

### 2. Three View Modes
| Mode | Use Case |
|------|----------|
| **Document** | Presenting, reading - clean blocks |
| **Hybrid** | Working - blocks with visible threads |
| **Chat** | Brainstorming - linear conversation flow |

### 3. Agents Participate in Both
- Agents edit blocks (suggest improvements)
- Agents reply in threads (discuss, answer)
- Agents transform between modes (chat → doc)

### 4. Fluid Transformation
- Start messy in Chat mode
- Collaborate in Hybrid mode
- Polish in Document mode
- Promote discussions to standalone docs

## Research Findings

### What I Studied

1. **Linear.app** - Shows threaded comments on issues can be elegant
2. **Figma** - Demonstrates context-aware discussions (comments on canvas)
3. **Notion** - Comments are sidebars, resolved = lost
4. **Roam/Obsidian** - Bidirectional links show documents as graphs
5. **AI in Docs Research** - Agents work best when embedded in collaboration flow

### Key Gaps Identified

| Tool | Gap |
|------|-----|
| Notion | Comments are ephemeral sidebars |
| Slack | Conversations scroll away, no structure |
| Linear | Threaded but limited to issues, not free-form docs |
| Figma | Great for designs, not general documents |

**No tool treats documents and conversations as the same thing.**

## The Prototype

### Features Built

1. **Block-based editor** with types: heading, paragraph, task, discussion
2. **Threaded discussions** on every block
3. **Three view modes** (Doc, Chat, Hybrid) with toggle
4. **Real-time collaboration** via WebSocket
5. **Agent system** with 3 agents (Claude, Scribe, Synthesizer)
6. **Agent mentions** (@Claude, @Scribe, @Synthesizer)
7. **Sample document** demonstrating the concept

### Demo Flow

1. Open http://localhost:3000
2. Select "Q1 Product Roadmap" document
3. Toggle between Doc/Chat/Hybrid views
4. Click + on any block to see threaded discussions
5. Add replies to blocks
6. Try @Claude in a reply
7. Add new blocks at the bottom

### Technical Stack

- Node.js + WebSocket (real-time)
- Vanilla JS frontend (no build step)
- In-memory storage (prototype)
- Dark mode UI

## Files Created

```
/root/.openclaw/workspace/
├── loopdoc/                    # Unified prototype
│   ├── server.js              # WebSocket server + agent engine
│   ├── public/
│   │   ├── index.html         # Main UI
│   │   ├── app.js             # Client application
│   │   └── styles.css         # Dark mode styling
│   ├── README.md              # Comprehensive docs
│   ├── LICENSE                # MIT
│   └── package.json
├── loopdoc_design.md          # Detailed design document
├── loopdoc-v0.1.0.tar.gz      # Packaged release
├── research_comparison.md     # Original research
├── threadloop/                # Original messenger prototype
└── threadloop-v0.1.0.tar.gz   # Original release
```

## Why This Wins

### 1. No Context Switching
Users don't switch between "doc tool" and "chat tool." It's the same tool, different view.

### 2. Natural Workflow
- Brainstorm in Chat mode
- Collaborate in Hybrid mode  
- Publish in Document mode
- Decisions captured in threads

### 3. AI-Native by Design
Agents participate naturally because:
- They can edit (like humans)
- They can discuss (like humans)
- They can transform (unique to agents)

### 4. Context Preservation
Discussions aren't resolved away—they become part of the document history. You can always see *why* a decision was made.

## Next Steps

### Immediate
1. Integrate real LLM APIs
2. Add persistent storage (PostgreSQL)
3. Agent memory across sessions

### Short-term
4. Multiple simultaneous editors
5. Cursor presence
6. Permission system

### Long-term
7. Database blocks (Notion-style)
8. GitHub sync (repos ↔ docs)
9. Custom agent builder
10. Mobile apps

## The Vision

LoopDoc isn't just a tool—it's a new way of thinking about work:

> **Documents and conversations are the same thing. The distinction is artificial. The future is fluid.**

In this future:
- Meeting notes ARE the meeting
- Requirements ARE the discussion
- Decisions ARE preserved in context
- Agents ARE team members

LoopDoc is the first step toward that future.

---

**Built with 🔄 for unified collaboration.**
