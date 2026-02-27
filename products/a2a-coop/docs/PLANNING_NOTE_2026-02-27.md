# A2A-Coop Planning Note

Date: 2026-02-27
Source: Codebase audit of `products/a2a-coop`

## Current Snapshot

- Core architecture is clear and modular: `AgentRegistry`, `MessageBus`, `ContextStore`, `TaskOrchestrator`.
- Public surfaces exist for both WebSocket and REST.
- Test coverage is broad (148 tests passing in a full local environment).
- TypeScript typecheck passes.

## Priority Findings

1. Authentication is initialized but not enforced in REST/WebSocket request handling.
2. JWT signing implementation is incorrect for `HS256` (uses hash, not HMAC).
3. Storage and metrics modules are mostly scaffolded and not integrated into operational flows.
4. Message subscription lifecycle leaks (missing unsubscribe on disconnect) and event payload shape is inconsistent in client API.
5. Documentation/package command mismatch (`README` references `a2a-coop-server`, package bin exposes `a2a-coop`).

## Planning Goals

- Close security correctness gaps first.
- Improve runtime reliability and lifecycle management.
- Make observability and persistence actually operational.
- Align docs with shipped package behavior.

## Phased Plan

### Phase 1: Security Baseline (P0)

- Enforce auth at entry points:
  - REST: authenticate every `/api/*` route (except allowed health path behavior).
  - WebSocket: authenticate on connect and/or per message, then authorize operations.
- Replace JWT signature logic with `crypto.createHmac('sha256', secret)`.
- Add auth-focused tests:
  - unauthorized requests rejected,
  - permission-based access checks,
  - valid/invalid token behavior.

Definition of done:
- Requests without valid credentials cannot mutate system state when auth is enabled.
- JWT tokens signed by the library validate using standard HS256 expectations.

### Phase 2: Runtime Reliability (P1)

- Track unsubscribe handlers for `message.subscribe` and clean them on disconnect.
- Resolve client event contract mismatch:
  - either emit raw `message` to handler, or change handler type/docs to event payload shape.
- Clear pending request timers on response/rejection and close to avoid post-test/process leaks.

Definition of done:
- No leaked subscriptions after client disconnect.
- No lingering timers/open-handle warnings in tests.

### Phase 3: Operational Integration (P1)

- Wire storage calls into lifecycle paths:
  - agent/task/context create/update/delete,
  - message persistence where enabled.
- Wire metrics recording in key flows:
  - request counts/durations/errors,
  - task transitions,
  - message and connection counters.
- Add integration tests for storage-backed mode and metrics endpoint assertions.

Definition of done:
- Enabling storage changes data durability behavior from process memory only.
- `/metrics` reflects real runtime activity rather than mostly empty/default counters.

### Phase 4: Product Hygiene (P2)

- Fix README startup command to match published bin.
- Update roadmap checkboxes to reflect what is truly implemented vs scaffolded.
- Reduce noisy runtime logging in tests or gate logs by environment.

Definition of done:
- Quickstart works exactly as written.
- Documentation accurately represents implementation status.

## Suggested Execution Order

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4

## Risks and Dependencies

- Auth rollout may break existing unauthenticated clients; consider a transition mode.
- Storage integration introduces async error-handling paths in currently synchronous core flows.
- Metrics integration should avoid meaningful request-path overhead.

## Deliverables

- Security patch set (auth + JWT + tests)
- Reliability patch set (subscription lifecycle + client contract + timer cleanup)
- Operational patch set (storage + metrics wiring + tests)
- Documentation patch set (README/roadmap alignment)
