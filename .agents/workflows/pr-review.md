---
description: Comprehensive PR review using 6 specialized review perspectives covering code comments, test coverage, error handling, type design, code quality, and code simplification.
---

# PR Review Workflow

Run a comprehensive pull request review using 6 specialized review perspectives.

## Steps

### 1. Identify the Changes
```bash
# Get the diff for the current branch vs main
git diff main...HEAD
```

### 2. Run All 6 Review Perspectives

#### A. Comment Analysis
- Check comment accuracy vs actual code behavior
- Flag outdated or misleading comments
- Identify missing documentation for complex logic

#### B. Test Coverage Analysis
- Evaluate behavioral coverage (not just line coverage)
- Identify critical gaps in test coverage
- Check edge cases and error conditions
- Rate gaps 1-10 (10 = critical, must add)

#### C. Silent Failure Detection
- Scan for empty catch blocks
- Find inadequate error handling
- Flag inappropriate fallback behavior
- Check for missing error logging

#### D. Type Design Analysis (TypeScript)
- Rate type encapsulation (1-10)
- Rate invariant expression (1-10)
- Rate type usefulness (1-10)
- Rate invariant enforcement (1-10)

#### E. General Code Review
- Check project guideline compliance
- Detect bugs in changed code
- Score issues 0-100 (only report ≥ 80)
- Provide specific file:line references

#### F. Code Simplification
- Identify unnecessary complexity
- Flag redundant abstractions
- Suggest simplifications that preserve functionality
- Check consistency with project standards

### 3. Consolidate Findings
- Prioritize by severity
- Group related issues
- Remove duplicates across perspectives
- Present actionable summary

### 4. Recommended Fix Order
1. Critical bugs and security issues
2. Silent failures and error handling
3. Test gaps for new functionality
4. Type design improvements
5. Code simplification
6. Comment accuracy

## Workflow Sequence
```
Write code → Code Review (E)
Fix issues → Silent Failure Hunt (C)
Add tests  → Test Analysis (B)
Document   → Comment Analysis (A)
Review passes → Code Simplifier (F)
Create PR
```

---

*Ported from claude-plugins-official/pr-review-toolkit by Daisy (Anthropic)*
