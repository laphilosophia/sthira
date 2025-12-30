---
description: How to implement a new feature in Sthira
---

# Feature Implementation Workflow

// turbo-all

## 1. Spec First
Before writing ANY code:

1. Find the relevant canonical document in `docs/`
2. If the feature isn't documented → create/update spec first
3. Get spec approved before implementation

Required spec sections:
- What the feature does
- FSM implications (if any)
- Error cases
- Edge cases

## 2. Create Feature Branch
```bash
git checkout develop
git pull origin develop
git checkout -b feat/your-feature-name
```

## 3. Write Tests First (TDD)
```bash
# Create test file
touch src/__tests__/your-feature.test.ts
```

Write tests that:
- Cover happy path
- Cover error cases
- Cover edge cases from spec
- Reference spec section in comments

## 4. Implement Feature
```bash
# Create implementation file
touch src/core/your-feature.ts
```

Implementation rules:
- Match spec exactly
- No `any` types
- JSDoc on exports
- No TODO without issue

## 5. Verify
```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

All must pass.

## 6. Commit
```bash
git add .
git commit -m "feat(scope): implement feature

- Detail 1
- Detail 2

Refs: #issue
Spec: document.md §section"
```

## 7. Push & PR
```bash
git push origin feat/your-feature-name
```

Create PR with:
- Spec reference
- Test coverage proof
- Breaking changes (if any)

## 8. Review & Merge
- Wait for required approvals
- Address all BLOCKER comments
- Squash merge to develop
