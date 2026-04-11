# Claude Code + Antigravity — Power User Manual

> Your AI coding setup is two tools working together. This is how to get the most out of both.

---

## What You Have

| Tool | What It Is | Best For |
|------|-----------|----------|
| **Antigravity** | AI coding assistant in your IDE (the one reading this) | Research, planning, browser testing, multi-file understanding, visual verification |
| **Claude Code** | CLI-based AI agent in your terminal | Fast execution, autonomous coding, file creation, ralph-loops, plugin workflows |

**They share the same codebase** but have different strengths. Think of Antigravity as the architect and Claude Code as the builder.

---

## Part 1: Claude Code Slash Commands

Slash commands are shortcuts defined in `.agents/workflows/`. They automate multi-step processes.

### `/commit` — Ship Your Code

**What it does:** Auto-generates a commit message, stages changes, commits, and pushes.

**When to use:** After any completed task. Don't manually write commit messages.

```
# In Claude Code, just type:
/commit

# It will:
# 1. Run git diff to see what changed
# 2. Generate a conventional commit message (feat:, fix:, refactor:)
# 3. Stage all changes
# 4. Commit and push to current branch
```

**Pro tip:** Run this after every workstream, not after every file. One clean commit per feature.

---

### `/ralph-loop` — Autonomous Iteration

**What it does:** Prevents Claude Code from stopping until the job is actually done.

**The problem it solves:** Normally Claude Code works, hits an error, reports it to you, and waits. You then say "fix it." This back-and-forth wastes time.

**How it works:**

```
Without /ralph-loop:
  You: "Build the algo engine"
  Claude: *writes 3 files* "Done! But there are 2 type errors."
  You: "Fix them"
  Claude: *fixes* "Done! But now there's an import error."
  You: "Fix that too"
  ...repeat 8 times...

With /ralph-loop:
  You: "Build the algo engine" + /ralph-loop
  Claude: *writes 3 files, gets errors, fixes them, rebuilds,
           fixes more, rebuilds again, all automatically*
  Claude: "All done. Build passes. 0 errors."
```

**When to use:**
- Tasks with clear pass/fail criteria (build passes, tests pass)
- Porting code from one language to another
- Scaffolding multiple interconnected files
- Any task where you'd otherwise say "fix it" 5+ times

**When NOT to use:**
- You need to make design decisions mid-task
- The task is vague ("make it look better")
- One-shot simple changes

**How to use:**

```
# Step 1: Give Claude Code a detailed prompt with clear exit criteria
# Step 2: Type /ralph-loop
# Step 3: Walk away. Come back when it's done.

# Example exit criteria:
# "Keep iterating until:
#   - npx next build passes with 0 errors
#   - npx tsc --noEmit passes with 0 type errors
#   - All 7 files exist and export their interfaces"
```

---

### `/ship` — Publish to PyPI

**What it does:** Full SDK release workflow — version bump, build, publish.

**When to use:** Only when shipping `hyper-sentinel` to PyPI. **Never skip steps.**

```
/ship
# Runs through:
# 1. Bump version in pyproject.toml
# 2. Build with python -m build
# 3. Upload with twine
# 4. Verify on PyPI
```

---

### `/pr-review` — 6-Perspective Code Review

**What it does:** Reviews your changes from 6 different angles:

| Perspective | What It Checks |
|-------------|----------------|
| **Comments** | Are there enough? Are they helpful? |
| **Tests** | Coverage gaps, missing edge cases |
| **Errors** | Silent failures, unhandled exceptions |
| **Types** | Type safety, interface design |
| **Quality** | Code smells, duplication, complexity |
| **Simplification** | Can anything be removed or simplified? |

**When to use:** Before committing significant changes. After a ralph-loop completes.

```
/pr-review
# Reviews all uncommitted changes
# Returns actionable findings with confidence scores
# High-confidence findings = definitely fix
# Low-confidence = judgment call
```

---

## Part 2: Your 12 Plugins

Plugins extend Claude Code's capabilities. They're installed at `~/.claude/plugins/`.

### Build & Design Plugins

| Plugin | What It Does | When to Use |
|--------|-------------|-------------|
| **frontend-design** | Generates production-grade UI components | Building new pages or panes. Ensures dark theme, proper spacing, animations |
| **feature-dev** | 7-phase guided development workflow | New features that touch multiple files. Goes: Discovery → Explore → Questions → Design → Build → Review → Summary |

**Example — Using feature-dev for the algo engine:**
```
# In Claude Code:
# "I need to build an algo trading engine. Use the feature-dev workflow."
# 
# Claude Code will:
# Phase 1: Read existing code to understand patterns
# Phase 2: Explore related files (StrategyPane, store, hooks)
# Phase 3: Ask clarifying questions (which algos? localStorage or API?)
# Phase 4: Design the architecture (interfaces, file structure)
# Phase 5: Implement all files
# Phase 6: Self-review the code
# Phase 7: Summarize what was built
```

---

### Code Quality Plugins

| Plugin | What It Does | When to Use |
|--------|-------------|-------------|
| **code-review** | Automated code review with confidence scoring | Before committing. Catches bugs, style issues, missing error handling |
| **pr-review-toolkit** | Multi-agent PR review (6 perspectives) | Bigger changes. More thorough than code-review |
| **security-guidance** | Security vulnerability scanning | Any code handling auth, keys, user input, or API calls |

---

### Workflow Plugins

| Plugin | What It Does | When to Use |
|--------|-------------|-------------|
| **commit-commands** | `/commit`, `/commit-push-pr`, `/clean_gone` shortcuts | Every time you finish work |
| **ralph-loop** | Autonomous iteration loops | Tasks with clear exit criteria |
| **hookify** | Create custom validation rules | When you want to enforce patterns (e.g., "no emojis in UI") |

---

### Development Plugins

| Plugin | What It Does | When to Use |
|--------|-------------|-------------|
| **plugin-dev** | Create and validate new plugins | Building your own slash commands or skills |
| **agent-sdk-dev** | Scaffold Claude Agent SDK apps | Building standalone AI agents |

---

### Output Style Plugins (Currently Active)

| Plugin | What It Does |
|--------|-------------|
| **explanatory-output-style** | Adds "Insight" blocks explaining WHY code was written a certain way |
| **learning-output-style** | Pauses at decision points to teach you instead of just implementing |

> These are both active right now, which is why Claude Code shows `* Insight` blocks in its output.

---

## Part 3: Memory & Knowledge System

### How Memory Works

Both Antigravity and Claude Code can access stored knowledge:

```
~/.gemini/antigravity/knowledge/     ← Curated knowledge items (KIs)
~/.gemini/antigravity/brain/         ← Conversation logs and artifacts
~/Antigravity/Python/Knowledgebase/  ← Your project docs and briefs
```

### Knowledge Items (KIs)

KIs are distilled summaries of important context. You have several:

| KI | What It Contains |
|----|-----------------|
| `sentinel_ground_truth` | Business entity, Stripe config, wallet addresses, deployment URLs |
| `strat_plan` | API architecture, SDK pivot strategy, revenue model |
| `mnfisher_sentinel_ecosystem` | Full project history, 70+ tools, architecture docs |
| `sdlc_aura` | AI-augmented development prompts for each stage |
| `sdlp_prompts` | 10 copy-paste prompts for planning, shipping, debugging |
| `ralph_wiggum_loops` | Deep dive on the loop pattern architecture |

### How to Reference Knowledge

**In Antigravity (me):** I automatically check KIs at the start of conversations. You can say "reference the knowledgebase" and I'll pull relevant docs.

**In Claude Code:** Point it to files directly:
```
# In Claude Code:
"Read ~/Antigravity/Python/Knowledgebase/00_Current_April_2026/2026_04_08_DAILY_BRIEF_AND_ROADMAP.md
 and use it as context for this task."
```

### Your Knowledgebase Directory

```
~/Antigravity/Python/Knowledgebase/00_Current_April_2026/
├── 2026_04_04_SWARM_AND_ALGO_ARCHITECTURE.md   ← Algo engine design
├── 2026_04_08_DAILY_BRIEF_AND_ROADMAP.md       ← Current sprint status
└── ... other briefs
```

**Pro tip:** When starting a new Claude Code session, always tell it to read the latest daily brief. It doesn't have persistent memory between sessions — you need to feed it context.

---

## Part 4: Antigravity-Specific Tools

### Browser Testing

I (Antigravity) can open a real browser, navigate to your running app, and take screenshots:

```
# I can:
- Navigate to localhost:3000
- Click buttons, fill forms
- Take screenshots to show you the UI
- Run Lighthouse audits (accessibility, SEO)
- Check network requests and console errors
- Record browser sessions as videos
```

**When this matters:** After building UI, I visually verify it looks right.

### Image Generation

I can generate images for use in your app — logos, hero graphics, placeholder content.

### MCP Servers

You have `chrome-devtools-mcp` connected, which gives me direct access to:
- Page snapshots (DOM tree)
- Click/type/hover on elements
- Network request inspection
- Console log reading
- Performance tracing

---

## Part 5: Optimal Workflows

### The "Architect + Builder" Pattern

This is the most effective way to use both tools:

```
1. ANTIGRAVITY (me): Research + Plan + Whiteboard
   - Read the codebase
   - Understand the architecture
   - Write a detailed prompt with types, interfaces, file structure
   - Save it as a .md file

2. CLAUDE CODE: Execute + Iterate
   - Read the prompt
   - Use /feature-dev for architecture phase
   - Use /ralph-loop for implementation
   - Use /commit when done

3. ANTIGRAVITY (me): Verify + Polish
   - Open browser, check the UI
   - Take screenshots
   - Run build checks
   - Catch visual issues Claude Code can't see
```

### The "Solo Sprint" Pattern

For when you want Claude Code to handle everything:

```
1. Write a detailed prompt (or have me write one)
2. Paste into Claude Code
3. /ralph-loop
4. Walk away
5. Come back, /pr-review, /commit
```

### Decision Tree: Which Tool When?

```
Need to understand the codebase?          → Antigravity
Need to see the UI?                       → Antigravity (browser)
Need to write a detailed plan?            → Antigravity
Need to scaffold multiple files fast?     → Claude Code
Need autonomous iteration?               → Claude Code + /ralph-loop
Need to commit/push?                      → Claude Code + /commit
Need to publish to PyPI?                  → Claude Code + /ship
Need a code review?                       → Claude Code + /pr-review
Need to debug visually?                   → Antigravity (browser + devtools)
Need security review?                     → Claude Code + security-guidance plugin
Building a new feature from scratch?      → Claude Code + feature-dev plugin
Porting Python to TypeScript?             → Claude Code + /ralph-loop
Quick fix or one-liner?                   → Either one, doesn't matter
```

---

## Part 6: Pro Tips

### 1. Context is Everything
Both tools are only as good as the context you give them. Always reference:
- The daily brief
- Relevant knowledgebase docs  
- The AGENTS.md rules file
- Actual source files (not descriptions of them)

### 2. Prompts Beat Plugins
A well-written prompt with clear exit criteria will outperform any plugin. The prompt I wrote for the algo engine (~400 lines with full type definitions) is worth more than 10 plugin invocations.

### 3. Commit Often
`/commit` after every completed workstream. Don't let changes pile up.

### 4. Use Ralph Loop for Compilation Tasks
Anything where Claude Code needs to iterate until a build passes is perfect for `/ralph-loop`. Don't babysit compilation errors.

### 5. Let Me Handle Browser Stuff
Claude Code can't see your UI. I can. Use me for visual verification, screenshots, and browser-based testing.

### 6. Name Your Sessions
In Claude Code: `/rename algo-engine-build`. Makes it easy to resume later with `/resume`.

### 7. The AGENTS.md File is Law
Your `.agents/AGENTS.md` file contains all project rules (dark theme, no emojis, design tokens). Both tools read it. Update it when patterns change.

---

## Quick Reference Card

```
CLAUDE CODE COMMANDS:
  /commit              Auto-commit + push
  /ralph-loop          Iterate until done
  /ship                Publish to PyPI
  /pr-review           6-perspective code review

PLUGINS (auto-loaded):
  frontend-design      Production UI generation
  feature-dev          Guided 7-phase development
  code-review          Automated review + scoring
  security-guidance    Security scanning
  ralph-loop           Autonomous iteration
  hookify              Custom validation rules
  commit-commands      Git shortcuts
  pr-review-toolkit    Multi-agent review

ANTIGRAVITY TOOLS:
  Browser testing      Navigate, click, screenshot
  Image generation     Create assets
  Chrome DevTools      Network, console, DOM
  Knowledge base       Read past context
  Artifacts            Plans, walkthroughs, tasks

KNOWLEDGE LOCATIONS:
  ~/.gemini/antigravity/knowledge/         KIs
  ~/Antigravity/Python/Knowledgebase/      Project docs
  ~/Antigravity/webdev/.agents/            Project rules + workflows
```
