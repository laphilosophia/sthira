# Sthira Development Standards & Governance

> **PRIORITY ZERO**: This document governs all development activity.
> No code is merged without compliance. No exceptions.

---

## 1. Document Hierarchy & Alignment

### 1.1 Canonical Truth

The following documents define **what Sthira is**:

| Priority | Document | Role |
|----------|----------|------|
| 1 | `execution-semantics.md` | Normative root — all else must align |
| 2 | `api-contract.md` | Public API surface contract |
| 3 | `failure-taxonomy.md` | Error classification |
| 4 | `scheduler-priority.md` | Scheduling rules |
| 5 | `worker-lifecycle.md` | Worker behavior |
| 6 | `cache-ref-binding.md` | Cache semantics |

### 1.2 Alignment Rule

> **Every code change MUST be traceable to a canonical document.**

Before writing code, answer:

1. Which document defines this behavior?
2. Does my implementation match the spec exactly?
3. If the spec is unclear, update the spec FIRST.

**Code without doc alignment = rejected.**

### 1.3 Spec-First Development

```
1. Identify requirement
2. Find or create canonical doc section
3. Review doc for completeness
4. Implement to spec
5. Test against spec assertions
6. PR references doc section
```

---

## 2. Zero Technical Debt Policy

### 2.1 Definition

Technical debt includes:

- `// TODO` comments without linked issues
- `// FIXME` without immediate resolution
- `any` types in TypeScript
- Skipped tests (`it.skip`, `describe.skip`)
- Unhandled edge cases documented in spec
- Console.log statements in production code
- Dead code or unused exports
- Missing JSDoc on public APIs

### 2.2 Enforcement

| Violation | Action |
|-----------|--------|
| TODO without issue | PR blocked |
| any type | PR blocked |
| Skipped test | PR blocked |
| Missing JSDoc on export | PR blocked |
| Console.log in src/ | PR blocked |
| Dead code | PR blocked |

### 2.3 Debt Resolution

If debt is discovered:

1. Create issue immediately
2. Link to affected code
3. Assign severity (P0-P3)
4. P0/P1 blocks next release

**No "we'll fix it later" is acceptable.**

---

## 3. TypeScript Standards

### 3.1 Strict Mode

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### 3.2 Type Safety Rules

| Rule | Enforcement |
|------|-------------|
| No `any` | Error |
| No `as` type assertions (except test mocks) | Error |
| No `!` non-null assertions | Error |
| No `@ts-ignore` | Error |
| No `@ts-expect-error` without issue link | Error |

### 3.3 Naming Conventions

```typescript
// Types: PascalCase
type TaskStatus = "pending" | "running"

// Interfaces: PascalCase, no "I" prefix
interface Scope { }

// Classes: PascalCase
class ScopeFSM { }

// Functions: camelCase
function createScope() { }

// Constants: SCREAMING_SNAKE_CASE
const MAX_CONCURRENT_TASKS = 10

// Private fields: underscore prefix
private _state: FSMState
```

### 3.4 File Organization

```
/src
  /core           # Internal implementation
  /api            # Public exports only
  /types          # Shared type definitions
  /errors         # Error classes
  /utils          # Pure utility functions
  /__tests__      # Co-located tests
```

---

## 4. Testing Requirements

### 4.1 Coverage Thresholds

| Metric | Minimum |
|--------|---------|
| Statements | 90% |
| Branches | 85% |
| Functions | 90% |
| Lines | 90% |

**Coverage below threshold = build failure.**

### 4.2 Test Categories

| Category | Location | Runner |
|----------|----------|--------|
| Unit | `__tests__/*.test.ts` | Vitest |
| Integration | `__tests__/integration/*.test.ts` | Vitest |
| E2E | `e2e/*.spec.ts` | Playwright |

### 4.3 Test Naming Convention

```typescript
describe("ScopeFSM", () => {
  describe("transition", () => {
    it("should transition from INIT to ATTACHED on mounted event", () => {})
    it("should reject transition from DISPOSED state", () => {})
    it("should throw on invalid event", () => {})
  })
})
```

Format: `should [expected behavior] when [condition]`

### 4.4 Test Requirements

Every test MUST:

1. Test ONE behavior
2. Have clear arrange/act/assert sections
3. Use descriptive names
4. Not depend on other tests
5. Clean up after itself
6. Reference spec section in comment if non-obvious

```typescript
// Spec: execution-semantics.md §4 - FSM is authoritative
it("should reject execution when FSM is DISPOSED", () => {
  // arrange
  const scope = createScope({ name: "test" })
  scope.dispose()

  // act & assert
  expect(() => scope.run(taskFn)).toThrow(ScopeInactiveError)
})
```

### 4.5 Forbidden in Tests

- `any` types
- Timeouts over 5 seconds
- Network calls (mock all external)
- Shared mutable state between tests
- `console.log` (use test reporters)

---

## 5. Git Workflow

### 5.1 Branch Strategy

```
main                 # Production-ready, protected
  └── develop        # Integration branch
       └── feat/*    # Feature branches
       └── fix/*     # Bug fixes
       └── docs/*    # Documentation only
       └── refactor/*# Code improvements
```

### 5.2 Branch Naming

```
feat/scope-fsm-implementation
fix/worker-abort-signal-propagation
docs/update-execution-semantics
refactor/scheduler-queue-optimization
```

### 5.3 Commit Message Format

```
type(scope): short description

- Detail 1
- Detail 2

Refs: #issue-number
Spec: document.md §section
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

Example:
```
feat(scope): implement FSM state transitions

- Add ScopeFSM class with all states
- Implement canExecute() and isAlive() guards
- Add transition logging for DevTools

Refs: #42
Spec: execution-semantics.md §4
```

### 5.4 Commit Rules

| Rule | Enforcement |
|------|-------------|
| Conventional commit format | CI check |
| Max 72 chars first line | CI check |
| Must reference issue or spec | CI check |
| No merge commits in feature branches | CI check |

---

## 6. Pull Request Requirements

### 6.1 PR Checklist

Every PR must include:

- [ ] Spec reference (which doc section this implements)
- [ ] Tests for all new code
- [ ] No decrease in coverage
- [ ] JSDoc on all public APIs
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Changelog entry (if user-facing)
- [ ] Breaking change noted (if applicable)

### 6.2 PR Size Limits

| Size | Lines Changed | Review Requirement |
|------|---------------|-------------------|
| XS | < 50 | 1 approval |
| S | 50-200 | 1 approval |
| M | 200-500 | 2 approvals |
| L | 500-1000 | 2 approvals + architect |
| XL | > 1000 | Split required |

### 6.3 PR Title Format

```
type(scope): description [#issue]
```

Example: `feat(task): implement abort signal propagation [#42]`

### 6.4 Required Reviewers

| Change Type | Required Reviewer |
|-------------|-------------------|
| Core runtime (scope, task, authority) | Architect |
| Public API | API owner |
| Types | Type system owner |
| Tests only | Any maintainer |
| Docs only | Any maintainer |

---

## 7. CI/CD Pipeline

### 7.1 On Every Push

```yaml
jobs:
  lint:
    - ESLint (zero warnings)
    - Prettier check
    - TypeScript strict check

  test:
    - Unit tests
    - Coverage check (90%+)

  build:
    - TypeScript compilation
    - Bundle size check
```

### 7.2 On PR

```yaml
jobs:
  all-of-above: true

  integration:
    - Integration tests
    - E2E smoke tests

  docs:
    - Spec alignment check
    - API doc generation

  security:
    - Dependency audit
    - License check
```

### 7.3 On Merge to Main

```yaml
jobs:
  all-of-above: true

  release:
    - Version bump (semantic-release)
    - Changelog generation
    - NPM publish (if release)
    - GitHub release
```

### 7.4 Required Status Checks

All must pass before merge:

- `lint`
- `typecheck`
- `test:unit`
- `test:coverage`
- `build`
- `security:audit`

---

## 8. Code Review Standards

### 8.1 Reviewer Responsibilities

1. **Correctness**: Does it match the spec?
2. **Completeness**: Are edge cases handled?
3. **Tests**: Are tests sufficient?
4. **Types**: Are types precise (no `any`)?
5. **Naming**: Is naming clear and consistent?
6. **Performance**: Any obvious inefficiencies?
7. **Security**: Any vulnerabilities?

### 8.2 Review Comments

Use prefixes:

- `[BLOCKER]` — Must fix before merge
- `[SUGGESTION]` — Consider this improvement
- `[QUESTION]` — Need clarification
- `[NIT]` — Minor style preference

### 8.3 Review Timeline

| PR Size | Initial Review | Resolution |
|---------|---------------|------------|
| XS/S | 4 hours | 24 hours |
| M | 8 hours | 48 hours |
| L | 24 hours | 72 hours |

---

## 9. Documentation Standards

### 9.1 Code Documentation

Every public export MUST have JSDoc:

```typescript
/**
 * Creates a new execution scope.
 *
 * @param config - Scope configuration
 * @returns Scope handle with dispose method
 *
 * @example
 * ```ts
 * const scope = createScope({ name: "insights" })
 * // Use scope...
 * scope.dispose()
 * ```
 *
 * @see {@link docs/technical.md#scope} for full specification
 */
export function createScope(config: ScopeConfig): ScopeHandle { }
```

### 9.2 Inline Comments

Use sparingly. Code should be self-documenting.

When needed:
```typescript
// Spec: execution-semantics.md §4 - FSM is authoritative
// We check isAlive() before canExecute() because disposed scopes
// should fail fast without checking execution eligibility.
if (!this.fsm.isAlive()) {
  throw new ScopeInactiveError(this.id)
}
```

### 9.3 README Requirements

Each package must have:

- Purpose (one sentence)
- Installation
- Quick start example
- API reference link
- Contributing link

---

## 10. Release Process

### 10.1 Semantic Versioning

```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes
MINOR: New features (backward compatible)
PATCH: Bug fixes (backward compatible)
```

### 10.2 Release Checklist

- [ ] All tests pass
- [ ] No open P0/P1 issues
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Docs updated
- [ ] Migration guide (if breaking)

### 10.3 Breaking Change Policy

Breaking changes require:

1. RFC document
2. Deprecation warning in previous minor release
3. Migration guide
4. Minimum 2-week notice

---

## 11. Dependency Management

### 11.1 Dependency Rules

| Type | Allowed |
|------|---------|
| Runtime deps | Minimal, audited |
| Dev deps | As needed |
| Peer deps | Framework adapters only |

### 11.2 Dependency Criteria

Before adding dependency:

1. Is it actively maintained?
2. Does it have security issues?
3. What's the bundle size impact?
4. Can we implement it ourselves?
5. Is the license compatible (MIT/Apache)?

### 11.3 Update Policy

- Security updates: Immediate
- Minor updates: Weekly
- Major updates: Per-release review

---

## 12. Performance Standards

### 12.1 Bundle Size Limits

| Package | Max Size (gzipped) |
|---------|-------------------|
| @sthira/core | 10 KB |
| @sthira/react | 3 KB |
| @sthira/devtools | 15 KB |

### 12.2 Runtime Performance

| Operation | Max Time |
|-----------|----------|
| Scope creation | < 1ms |
| Task activation | < 0.5ms |
| FSM transition | < 0.1ms |

### 12.3 Memory

- No memory leaks on dispose
- Weak references where appropriate
- Clear all timers/listeners on cleanup

---

## 13. Security Standards

### 13.1 Forbidden

- `eval()`
- `new Function()`
- `innerHTML` with user input
- Secrets in code/logs

### 13.2 Required

- Input validation on public APIs
- Proper error messages (no internal details)
- Audit trail for DevTools

---

## 14. Enforcement Summary

| Category | Enforcement Point |
|----------|------------------|
| Type safety | TypeScript strict mode |
| Code style | ESLint + Prettier |
| Test coverage | Vitest coverage threshold |
| Commit format | Commitlint |
| PR requirements | GitHub required checks |
| Doc alignment | Manual review + spec reference |
| Bundle size | Size-limit CI check |
| Security | npm audit + Snyk |

---

## 15. Violation Handling

### 15.1 Severity Levels

| Level | Description | Action |
|-------|-------------|--------|
| Critical | Security, data loss | Immediate revert |
| High | Breaking spec, major bug | Block release |
| Medium | Quality issue | Fix before next release |
| Low | Style, minor | Fix when convenient |

### 15.2 Escalation Path

1. PR reviewer flags issue
2. If disputed → Architect decision
3. If conflict → Team vote
4. Spec always wins

---

## Final Statement

> **These rules exist to protect Sthira's correctness guarantees.**
>
> Every shortcut today becomes a bug tomorrow.
> Every "temporary" hack becomes permanent debt.
>
> Build it right, or don't build it.

---

# Acceptance

By contributing to Sthira, you agree to follow these standards.

**No exceptions. No excuses. No debt.**
