---
description: Implementation of the Ralph Wiggum technique for iterative, self-referential development loops. Use for well-defined tasks with clear success criteria that benefit from persistent iteration.
---

# Ralph Loop Workflow

The Ralph Loop is a development methodology based on continuous iteration. A simple loop that repeatedly feeds a prompt, allowing iterative improvement until completion.

## When to Use
✅ Well-defined tasks with clear success criteria
✅ Tasks requiring iteration and refinement (e.g., getting tests to pass)
✅ Greenfield projects where you can walk away
✅ Tasks with automatic verification (tests, linters)

❌ Tasks requiring human judgment or design decisions
❌ One-shot operations
❌ Tasks with unclear success criteria
❌ Production debugging

## How to Use

### Step 1: Define the Task
Write a clear task description with:
- Specific requirements
- Success criteria
- Completion signal

### Step 2: Define Completion Criteria
Include a clear "done" condition:
```
When complete:
- All CRUD endpoints working
- Input validation in place
- Tests passing (coverage > 80%)
- README with API docs
```

### Step 3: Execute Iteratively
1. Work on the task
2. Run verification (tests, linters, etc.)
3. If failures, read the output and fix
4. Repeat until all criteria met

### Step 4: Safety Limits
Always set a maximum iteration count to prevent infinite loops on impossible tasks.

## Best Practices

### 1. Clear Completion Criteria
❌ "Build a todo API and make it good."
✅ "Build a REST API with CRUD operations, input validation, tests passing, and README."

### 2. Incremental Goals
❌ "Create a complete e-commerce platform."
✅ "Phase 1: Auth. Phase 2: Products. Phase 3: Cart. Each with tests."

### 3. Self-Correction Loops
```
1. Write failing tests
2. Implement feature
3. Run tests
4. If any fail, debug and fix
5. Refactor if needed
6. Repeat until all green
```

### 4. Escape Hatches
After N iterations without progress:
- Document what's blocking
- List what was attempted
- Suggest alternative approaches

## Key Principles
1. **Iteration > Perfection** — Don't aim for perfect on first try
2. **Failures Are Data** — Use failures to refine approach
3. **Persistence Wins** — Keep trying until success
4. **Operator Skill Matters** — Good prompts > good models

---

*Ported from claude-plugins-official/ralph-loop by Geoffrey Huntley*
