# PM-Cursor Planning Note: Agent Ops P0

Date: 2026-02-27  
Scope: Multi-tenant architecture for a single human operator working with AI agents/subagents.

## Confirmed Product Direction

1. Team/multi-tenant by design, with single-human operation supported natively.
2. Agent actions auto-apply first, then human approves or rolls back afterward.
3. Priority is shipping new agent-facing products/APIs fast.
4. Primary user model is one human acting as an AI team lead.

## P0 Batch Implemented

### Foundation and velocity

1. Turbo v2 root script compatibility fixed (`pipeline` -> `tasks`).
2. Missing API/Web Dockerfiles added for compose compatibility.
3. Shared ESLint config added so workspace lint commands run.
4. Workspace typecheck/build/lint are passing from root.

### Team and workspace model

1. Auth flow now ensures a default personal workspace team.
2. Auth payload now includes `defaultTeamId` (+ membership details on `/auth/me`).
3. Team routes added:
   - `GET /api/v1/teams`
   - `GET /api/v1/teams/:id`
   - `POST /api/v1/teams`
4. Project create UI now uses real workspace team context (no hardcoded UUID).

### Approval-after agent workflow

1. Added `agent_actions` model with lifecycle:
   - `queued`
   - `running`
   - `applied_pending_approval`
   - `approved`
   - `rolled_back`
   - `failed`
2. Agent execution now records action state and returns approval metadata.
3. Approval APIs added:
   - `GET /api/v1/approvals`
   - `POST /api/v1/approvals/:id/approve`
   - `POST /api/v1/approvals/:id/rollback`
4. Rollback skeleton implemented for task-breakdown actions (delete created task IDs).
5. Added approvals operator UI page and nav entry.

### UX and contract cleanup

1. Auth token storage mismatch fixed in API client handling.
2. Socket URL derivation corrected and `leave-project` server event added.
3. Dashboard quick actions updated to existing routes.
4. API/web strict TypeScript blockers fixed.

## Open Planning Backlog (Next)

### P1: Agent UX and API expansion

1. Add `POST /api/v1/agent-runs` and `POST /api/v1/agent-runs/:id/delegate` for subagent orchestration.
2. Add run graph/timeline endpoints for deterministic agent traceability.
3. Add approval feed filters by project/team/action type with pagination.

### P1: Tenant security hardening

1. Enforce team membership checks across project/task/agent read/write paths.
2. Scope user listing to tenant/team context.
3. Add role policy matrix for owner/admin/member across team resources.

### P1: Rollback robustness

1. Store operation-level inverse data per mutation type (not only created task IDs).
2. Add idempotent rollback behavior and conflict handling.
3. Add rollback/approval integration tests.

### P2: Operator control surface

1. Bulk approve/rollback actions.
2. “What changed” diffs per agent action.
3. Guardrails/policies (blocked actions, rate limits, approval rules).

## Definition of Done for Next Milestone

1. Single user can register and receive an auto-provisioned workspace.
2. User can create projects/tasks/agents without hardcoded IDs.
3. Agent can run `breakdown/status/risks`, action appears in approvals.
4. User can approve or rollback action and see state reflected in UI/API.
5. Team-scoped authorization enforced on core project/task/agent endpoints.
