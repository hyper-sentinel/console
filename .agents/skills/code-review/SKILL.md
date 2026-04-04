---
name: code-review
description: Automated code review using multiple review perspectives with confidence-based scoring to filter false positives. Use when reviewing pull requests, recent changes, or before committing code.
---

# Code Review Skill

Perform thorough code review by independently auditing changes from multiple perspectives. Uses confidence scoring to filter false positives, ensuring only high-quality, actionable feedback.

## When to Use
- All pull requests with meaningful changes
- PRs touching critical code paths
- Before committing changes
- When reviewing code quality

## When NOT to Use
- Closed or draft PRs
- Trivial automated PRs
- Urgent hotfixes requiring immediate merge

---

## Review Process

### Step 1: Check If Review Is Needed
Skip review if:
- PR is closed or draft
- Changes are trivial (only whitespace, comments, etc.)
- PR has already been reviewed

### Step 2: Gather Guidelines
- Read CLAUDE.md / AGENTS.md / project rules
- Identify project-specific conventions and patterns
- Note any linting or formatting requirements

### Step 3: Summarize Changes
Provide a concise summary of what the PR/changes do.

### Step 4: Multi-Perspective Review
Review from 4 independent perspectives:

**Perspective 1 & 2: Guideline Compliance**
- Check against project rules (CLAUDE.md, AGENTS.md)
- Verify coding standards are followed
- Check naming conventions
- Validate file organization

**Perspective 3: Bug Detection**
- Scan for obvious bugs in the CHANGED code only
- Look for logic errors
- Check error handling
- Identify potential null/undefined issues
- Look for resource leaks
- **Do NOT flag pre-existing issues**

**Perspective 4: Context Analysis**
- Review git history for the changed files
- Understand why code was structured a certain way
- Identify if changes conflict with historical decisions
- Check for patterns broken by the changes

### Step 5: Confidence Scoring
Score each finding 0-100:
- **0**: Not confident, likely false positive
- **25**: Somewhat confident, might be real
- **50**: Moderately confident, real but minor
- **75**: Highly confident, real and important
- **100**: Absolutely certain, definitely real

### Step 6: Filter & Report
- Only report issues scoring **≥ 80**
- If no issues score ≥ 80, report "No high-confidence issues found"
- Format each issue with:
  - Description of the problem
  - File and line reference
  - Severity (critical/important/minor)
  - Suggested fix

---

## False Positive Filtering

Automatically filter out:
- Pre-existing issues not introduced in the changes
- Code that looks like a bug but isn't (intentional patterns)
- Pedantic nitpicks
- Issues linters will catch
- General quality issues (unless in project guidelines)
- Issues with lint-ignore comments

---

## Output Format

```
## Code Review

Found N issues:

1. [SEVERITY] Description of issue
   File: path/to/file.ts:L67-L72
   Confidence: 85
   Suggestion: How to fix it

2. ...
```

---

## Customization

### Adjusting Confidence Threshold
Default threshold is 80. For stricter reviews, increase; for more permissive, decrease.

### Adding Review Focus Areas
Add custom perspectives:
- Security-focused review
- Performance analysis
- Accessibility checking
- Documentation quality

---

## Tips
- Write specific project guidelines for better compliance checking
- Include context in PRs to help review quality
- Update project rules based on recurring review patterns
- Run review automatically as part of PR workflow

---

*Ported from claude-plugins-official/code-review by Boris Cherny (Anthropic)*
