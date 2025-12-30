---
description: How to verify doc alignment for any code change
---

# Doc Alignment Verification

Before any PR is approved, verify spec alignment:

## 1. Identify Relevant Docs

For each changed file, identify which docs govern it:

| Code Area | Governing Doc |
|-----------|--------------|
| Scope/FSM | execution-semantics.md §3-4 |
| Task lifecycle | execution-semantics.md §4 |
| Worker spawning | worker-lifecycle.md |
| Scheduler/priority | scheduler-priority.md |
| Cache behavior | cache-ref-binding.md |
| Error handling | failure-taxonomy.md |
| Public API | api-contract.md |
| DevTools events | devtool-execution-timeline.md |

## 2. Cross-Reference Check

For each behavior in the code:

1. Find the corresponding spec section
2. Verify exact match
3. Note any deviations

## 3. Deviation Handling

If code deviates from spec:

**Option A**: Code is wrong → Fix code
**Option B**: Spec is outdated → Update spec FIRST, then code

Never leave misalignment unresolved.

## 4. PR Spec Reference

Every PR must include:

```markdown
## Spec References

- `execution-semantics.md §4` - FSM state machine
- `worker-lifecycle.md §6` - Worker failure propagation
```

## 5. Terminology Check

Verify consistent terminology:

| Correct | Incorrect |
|---------|-----------|
| Scope | Boundary |
| Task | Reflex |
| ScopeID | BoundaryID |
| createScope | createBoundary |
| createTask | createReflex |

Run quick check:
```bash
grep -r "Boundary" src/
grep -r "Reflex" src/
grep -r "boundaryId" src/
```

All should return empty.

## 6. Final Verification

- [ ] All code behaviors match spec
- [ ] Terminology is consistent
- [ ] PR references spec sections
- [ ] No undocumented behaviors added
