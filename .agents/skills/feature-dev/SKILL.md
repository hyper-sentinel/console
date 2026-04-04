---
name: feature-dev
description: Comprehensive 7-phase workflow for feature development — discovery, codebase exploration, clarifying questions, architecture design, implementation, quality review, and summary. Use when building new features that touch multiple files or require architectural decisions.
---

# Feature Development Skill

A systematic 7-phase approach to building new features. Instead of jumping straight into code, this skill guides you through understanding the codebase, asking clarifying questions, designing architecture, and ensuring quality.

## When to Use
- New features that touch multiple files
- Features requiring architectural decisions
- Complex integrations with existing code
- Features where requirements are somewhat unclear

## When NOT to Use
- Single-line bug fixes
- Trivial changes
- Well-defined, simple tasks
- Urgent hotfixes

---

## The 7 Phases

### Phase 1: Discovery
**Goal**: Understand what needs to be built.

1. Clarify the feature request if unclear
2. Ask what problem is being solved
3. Identify constraints and requirements
4. Summarize understanding and confirm with the user

### Phase 2: Codebase Exploration
**Goal**: Understand relevant existing code and patterns.

1. Explore 2-3 areas of the codebase in parallel:
   - Find features similar to the requested one and trace implementation
   - Map the architecture and abstractions for the relevant area
   - Analyze current implementation of related features
2. For each area, identify:
   - Entry points and call chains
   - Data flow and transformations
   - Architecture layers and patterns
   - Dependencies and integrations
3. List all key files that need to be read
4. Present a comprehensive summary of findings

### Phase 3: Clarifying Questions
**Goal**: Fill in gaps and resolve all ambiguities.

1. Review codebase findings and feature request together
2. Identify underspecified aspects:
   - Edge cases
   - Error handling
   - Integration points
   - Backward compatibility
   - Performance needs
3. Present all questions in an organized list
4. **WAIT for user answers before proceeding**

### Phase 4: Architecture Design
**Goal**: Design multiple implementation approaches.

1. Design 2-3 approaches with different focuses:
   - **Minimal changes**: Smallest change, maximum reuse
   - **Clean architecture**: Maintainability, elegant abstractions
   - **Pragmatic balance**: Speed + quality
2. For each approach, document:
   - Component design and file structure
   - Trade-offs (pros/cons)
   - Implementation complexity estimate
3. Form a recommendation based on codebase analysis
4. Present comparison with trade-offs
5. **ASK which approach the user prefers**

### Phase 5: Implementation
**Goal**: Build the feature.

1. **Wait for explicit user approval** before starting
2. Read all relevant files identified in Phase 2
3. Implement following the chosen architecture
4. Follow codebase conventions strictly
5. Write clean, well-documented code
6. Track progress as you go

### Phase 6: Quality Review
**Goal**: Ensure code is simple, DRY, elegant, and functionally correct.

Review the implementation from 3 perspectives:

1. **Simplicity/DRY/Elegance**: Code quality and maintainability
   - Redundant code or logic
   - Overly complex solutions
   - Missed abstractions
2. **Bugs/Correctness**: Functional correctness and logic errors
   - Missing error handling
   - Edge cases not covered
   - Resource leaks
3. **Conventions/Abstractions**: Project standards and patterns
   - Naming conventions
   - File organization
   - Existing pattern compliance

For each issue found:
- Assign confidence score (0-100)
- Only report issues with confidence ≥ 80
- Provide specific file:line references

Present findings and ask the user:
- Fix now
- Fix later
- Proceed as-is

### Phase 7: Summary
**Goal**: Document what was accomplished.

Summarize:
- What was built
- Key decisions made
- Files modified/created
- Suggested next steps

---

## Best Practices

1. **Use the full workflow for complex features** — the 7 phases ensure thorough planning
2. **Answer clarifying questions thoughtfully** — Phase 3 prevents future confusion
3. **Choose architecture deliberately** — Phase 4 gives options for a reason
4. **Don't skip quality review** — Phase 6 catches issues before production
5. **Read the identified files** — Phase 2 identifies key files for context

---

*Ported from claude-plugins-official/feature-dev by Sid Bidasaria (Anthropic)*
