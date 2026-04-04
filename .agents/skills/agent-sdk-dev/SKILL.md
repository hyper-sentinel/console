---
name: agent-sdk-dev
description: Guide for creating and verifying Claude Agent SDK applications in Python and TypeScript. Use when scaffolding new agent projects, verifying SDK setup, or following SDK best practices.
---

# Agent SDK Development Skill

Streamline the lifecycle of building Agent SDK applications, from scaffolding to verification against best practices.

## When to Use
- Creating a new Agent SDK application
- Verifying an existing SDK project setup
- Checking SDK best practices compliance
- Setting up agent project structure

---

## New SDK App Workflow

### Step 1: Gather Requirements
Ask the user:
1. **Language**: TypeScript or Python?
2. **Project name**: What to call it?
3. **Agent type**: Coding, business, or custom?
4. **Starting point**: Minimal, basic, or specific example?

### Step 2: Scaffold Project

**For TypeScript:**
```bash
mkdir <project-name> && cd <project-name>
npm init -y
npm install @anthropic-ai/claude-agent-sdk
npx tsc --init
```

**For Python:**
```bash
mkdir <project-name> && cd <project-name>
python3 -m venv venv
pip install claude-agent-sdk
```

### Step 3: Create Files
- Main agent file with proper initialization
- Environment setup (`.env.example`, `.gitignore`)
- Configuration files (tsconfig.json / pyproject.toml)
- README with setup instructions

### Step 4: Verify Setup
Run the verification checklist (see below).

---

## Verification Checklist

### Python Projects
- [ ] SDK installed and importable
- [ ] Python environment setup (requirements.txt or pyproject.toml)
- [ ] Correct SDK usage patterns
- [ ] Agent initialization and configuration
- [ ] Environment security (.env, API keys not hardcoded)
- [ ] Error handling implemented
- [ ] Documentation complete

### TypeScript Projects
- [ ] SDK installed
- [ ] tsconfig.json configured correctly
- [ ] Correct SDK imports and types
- [ ] Type safety maintained
- [ ] Agent initialization correct
- [ ] Environment security (.env, API keys not hardcoded)
- [ ] Error handling implemented
- [ ] Documentation complete

---

## Verification Output Format

```
## SDK Verification Report

Status: PASS / PASS WITH WARNINGS / FAIL

Critical Issues:
- [list of blocking issues]

Warnings:
- [list of suboptimal patterns]

Passed Checks:
- [list of verified items]

Recommendations:
- [specific improvements with SDK doc references]
```

---

## Best Practices
- Always use the latest SDK version
- Verify before deploying
- Keep API keys in environment variables
- Follow official SDK documentation patterns
- Run type checking regularly (TypeScript)
- Create test cases for agent functionality

---

## Resources
- [Agent SDK Overview](https://docs.claude.com/en/api/agent-sdk/overview)
- [TypeScript SDK Reference](https://docs.claude.com/en/api/agent-sdk/typescript)
- [Python SDK Reference](https://docs.claude.com/en/api/agent-sdk/python)

---

*Ported from claude-plugins-official/agent-sdk-dev by Ashwin Bhat (Anthropic)*
