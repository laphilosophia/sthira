# Sthira Project Rules

> These rules are automatically enforced by the AI assistant.
> They must be followed for ALL interactions with this codebase.

## Priority Zero: Document Alignment

1. **ALWAYS** check `docs/` before writing code
2. **ALWAYS** reference the governing spec section
3. **NEVER** implement undocumented behavior
4. **NEVER** deviate from canonical documents

Canonical document hierarchy:
1. `execution-semantics.md` (normative root)
2. `api-contract.md`
3. `failure-taxonomy.md`
4. `scheduler-priority.md`
5. `worker-lifecycle.md`
6. `cache-ref-binding.md`

## Development Standards

Before ANY code change:
1. Run `/doc-alignment` to verify spec alignment
2. Run `/pre-commit` before committing
3. Follow `/feature-implementation` for new features

## Terminology (Enforced)

| Correct | Incorrect (NEVER use) |
|---------|----------------------|
| Scope | Boundary |
| Task | Reflex |
| ScopeID | BoundaryID |
| createScope | createBoundary |
| createTask | createReflex |
| useScope | useBoundary |
| useTask | useReflex |

## Code Quality (Enforced)

- NO `any` types
- NO `@ts-ignore`
- NO `// TODO` without issue link
- NO `console.log` in production code
- NO skipped tests
- 90% test coverage minimum

## Commit Format (Required)

```
type(scope): description

Refs: #issue
Spec: document.md §section
```

## Before Suggesting Code Changes

The AI assistant MUST:

1. ✅ Check which doc governs this behavior
2. ✅ Verify terminology is correct (Scope, not Boundary)
3. ✅ Ensure no `any` types are introduced
4. ✅ Include spec reference in comments for non-obvious code
5. ✅ Write tests for new code
6. ✅ Update docs if behavior changes

## Workflows Available

- `/pre-commit` - Pre-commit checklist
- `/feature-implementation` - New feature development
- `/doc-alignment` - Spec alignment verification

## Reference

Full development standards: `DEVELOPMENT.md`
