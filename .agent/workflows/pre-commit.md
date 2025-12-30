---
description: Pre-commit checklist for Sthira development
---

# Pre-Commit Workflow

Before committing any code, run through this checklist:

## 1. Spec Alignment Check
- [ ] Identify which doc section this change relates to
- [ ] Verify implementation matches spec exactly
- [ ] If spec is unclear, update spec FIRST before coding

## 2. Type Safety
// turbo
```bash
pnpm typecheck
```
- [ ] No TypeScript errors
- [ ] No `any` types added
- [ ] No `@ts-ignore` added

## 3. Lint Check
// turbo
```bash
pnpm lint
```
- [ ] No ESLint errors
- [ ] No ESLint warnings

## 4. Test Suite
// turbo
```bash
pnpm test
```
- [ ] All tests pass
- [ ] New code has tests
- [ ] Coverage >= 90%

## 5. Build Check
// turbo
```bash
pnpm build
```
- [ ] Build succeeds
- [ ] No console.log in production code

## 6. Commit Message Format
```
type(scope): description

- Detail 1
- Detail 2

Refs: #issue-number
Spec: document.md §section
```

## 7. PR Checklist
- [ ] Spec reference included
- [ ] Tests for all new code
- [ ] JSDoc on public APIs
- [ ] Changelog entry (if user-facing)
- [ ] Breaking change noted (if applicable)
