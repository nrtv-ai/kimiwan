# Product Dev Multi-Agent System

A collaborative coding system where multiple specialized agents work together on a single product.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Research Agent │────▶│   Dev Agent     │────▶│  Code Review    │
│                 │     │                 │     │     Agent       │
│ - Tech research │     │ - Implementation│     │ - PR review     │
│ - Architecture  │     │ - Coding        │     │ - Quality check │
│ - Best practices│     │ - Testing       │     │ - Feedback loop │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                        ┌─────────────────┐
                        │  GitHub PR      │
                        │  (Deliverable)  │
                        └─────────────────┘
```

## Agent Roles

### 1. Research Agent
- Researches technologies, libraries, and approaches
- Creates architecture recommendations
- Documents findings in `/memory/product-dev/{product}/research.md`
- Hands off to Dev Agent with clear implementation plan

### 2. Dev Agent
- Implements features based on research
- Writes code, tests, and documentation
- Creates feature branches and commits
- Requests code review when ready

### 3. Code Review Agent
- Reviews PRs for quality, security, best practices
- Provides actionable feedback
- Approves or requests changes
- Can loop back to Dev Agent for fixes

## Workflow

1. **Research Phase**: Research Agent investigates and documents
2. **Dev Phase**: Dev Agent implements based on research
3. **Review Phase**: Code Review Agent validates and approves
4. **Merge**: Final PR created and merged

## Current Product

See `/memory/product-dev/current.md` for active product details.

## Usage

```bash
# Start a new product development cycle
openclaw sessions_spawn --label product-research --task "Research [topic] for [product]"
```
