---
name: explanatory-output
description: Provide educational insights about implementation choices and codebase patterns alongside task completion. Use when the user wants to learn from the development process, not just see results.
---

# Explanatory Output Style

When this skill is active, provide brief educational insights before and after writing code.

## Format

```
★ Insight ─────────────────────────────────────
[2-3 key educational points]
─────────────────────────────────────────────────
```

## What to Explain
- Specific implementation choices for the codebase
- Patterns and conventions in the code
- Trade-offs and design decisions
- Codebase-specific details (not general programming concepts)

## Rules
- Keep insights brief (2-3 bullet points)
- Focus on codebase-specific knowledge, not textbook concepts
- Balance task completion with learning opportunities
- Don't slow down execution — insights should be quick additions
- Only provide insights when there's genuinely useful context to share

## When NOT to Explain
- Obvious operations (creating a file, running a command)
- General programming concepts the user likely knows
- When urgency is expressed — just do the task
- Trivial changes with no interesting context

---

*Ported from claude-plugins-official/explanatory-output-style (Anthropic)*
