---
description: Streamlined git workflow commands for committing, pushing, and creating pull requests with auto-generated messages.
---

# Commit Workflow

Automate git commit, push, and PR creation with intelligent message generation.

## Commands

### /commit — Smart Commit
// turbo
1. Check git status for staged and unstaged changes:
```bash
git status
```

// turbo
2. Review the diff:
```bash
git diff --cached; git diff
```

// turbo
3. Check recent commit style:
```bash
git log --oneline -10
```

4. Stage relevant files, draft a commit message matching the repo's style, and commit.

**Rules:**
- Follow conventional commit practices (feat:, fix:, chore:, docs:, etc.)
- Never commit files containing secrets (.env, credentials, API keys)
- Match the existing commit message style in the repo
- Keep the first line under 72 characters

### /commit-push-pr — Full PR Workflow
// turbo
1. Check if on main branch:
```bash
git branch --show-current
```

2. If on main, create a feature branch:
```bash
git checkout -b feature/<descriptive-name>
```

3. Stage and commit changes (follow /commit rules above)

4. Push to remote:
```bash
git push -u origin HEAD
```

5. Create PR with summary:
```bash
gh pr create --fill
```

**PR Description includes:**
- Summary of changes (1-3 bullet points)
- Test plan checklist
- Analysis of ALL commits in the branch, not just the latest

### /clean-gone — Branch Cleanup
// turbo
1. Fetch and prune remote tracking:
```bash
git fetch --prune
```

// turbo
2. Find stale branches:
```bash
git branch -vv | grep ': gone]'
```

3. Delete stale local branches that have been removed from remote.

**When to use:**
- After merging PRs
- When local branch list is cluttered
- Regular repository maintenance

---

*Ported from claude-plugins-official/commit-commands (Anthropic)*
