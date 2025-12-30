# Sthira Project Context

## Project Type
Deterministic execution engine kernel for frontend applications.

## Key Concepts
- **Authority**: Global execution governor (policies, scheduling)
- **Scope**: Execution namespace with FSM lifecycle
- **Task**: Single execution instance with immutable Ref
- **Worker**: Task-correlated execution unit
- **Handler**: Parallel execution method
- **Stream**: Runtime-controlled output channel
- **Ref**: Immutable execution symbol (identity, not data)

## Core Guarantee
> What runs, runs exactly when it is allowed to run — and never otherwise.

## Architecture
```
Authority → Scope → Task → Worker/Handler/Stream
```

## FSM States
INIT → ATTACHED → RUNNING → SUSPENDED → DISPOSING → DISPOSED

## Canonical Docs (in priority order)
1. docs/execution-semantics.md
2. docs/api-contract.md
3. docs/failure-taxonomy.md
4. docs/scheduler-priority.md
5. docs/worker-lifecycle.md
6. docs/cache-ref-binding.md

## Development Rules
- Spec-first: Document before code
- Zero debt: No TODO, no any, no skip
- TDD: Tests first
- 90% coverage minimum
- Strict TypeScript

## Terminology
- Use "Scope" not "Boundary"
- Use "Task" not "Reflex"
- Use "ScopeID" not "BoundaryID"

## Workflows
- /pre-commit
- /feature-implementation
- /doc-alignment

## Full Standards
See DEVELOPMENT.md for complete governance rules.
