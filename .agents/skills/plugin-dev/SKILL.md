---
name: plugin-dev
description: Comprehensive toolkit for developing Antigravity skills and workflows with expert guidance on structure, commands, and agent development. Use when creating new skills, workflows, or extending the agent system.
---

# Plugin & Skill Development Toolkit

This skill guides creation of new Antigravity skills and workflows. It covers structure, organization, content design, and best practices.

## When to Use
- Creating a new skill in `.agents/skills/`
- Creating a new workflow in `.agents/workflows/`
- Improving existing skill quality
- Organizing skill content and resources

---

## Antigravity Skill Structure

### Skill Format
```
.agents/skills/<skill-name>/
└── SKILL.md          # Main instruction file (required)
```

### SKILL.md Format
```yaml
---
name: <skill-name>
description: <One-line description. Must be specific about when to trigger.>
---

# <Skill Title>

<Detailed instructions in markdown>
```

### Workflow Format
```yaml
---
description: <Short description of what this workflow does>
---

# <Workflow Title>

<Step-by-step instructions>
```

---

## Skill Development Phases

### Phase 1: Discovery
1. What problem does this skill solve?
2. When should it trigger automatically?
3. What existing skills overlap?
4. What resources does it need?

### Phase 2: Structure
1. Choose type: skill (knowledge/guidance) vs workflow (step-by-step process)
2. Create the directory and SKILL.md
3. Write strong trigger description (specific phrases that activate it)

### Phase 3: Content Design
1. **Progressive disclosure**: Core instructions first, details later
2. **Imperative form**: "Do X" not "You should do X"
3. **Specific triggers**: List exact phrases that activate the skill
4. **Examples**: Include working examples for every pattern

### Phase 4: Validation
- [ ] Description is specific and actionable
- [ ] Instructions are clear and unambiguous
- [ ] Examples are complete and working
- [ ] No overlap with existing skills
- [ ] File is properly formatted YAML + markdown

---

## Writing Strong Descriptions

### ❌ Weak
```yaml
description: Helps with code quality
```

### ✅ Strong
```yaml
description: Automated code review using multiple review perspectives with confidence-based scoring to filter false positives. Use when reviewing pull requests, recent changes, or before committing code.
```

**Rules:**
- Describe WHAT it does AND WHEN to use it
- Include specific trigger scenarios
- Keep under 200 characters if possible
- Use active voice

---

## Content Best Practices

1. **Third-person descriptions**: "This skill should be used when..."
2. **Strong trigger phrases**: List specific questions/commands that activate it
3. **Imperative/infinitive form**: "Read the file" not "You should read the file"
4. **Structured sections**: Use headers, checklists, and code blocks
5. **Working examples**: Every pattern should have a concrete example

---

## Workflow Best Practices

1. **Numbered steps**: Clear sequence of actions
2. **Turbo annotations**: Mark safe-to-auto-run steps with `// turbo`
3. **Command blocks**: Exact commands the agent should run
4. **Decision points**: Clear branching logic
5. **Completion criteria**: How to know when done

---

*Adapted from claude-plugins-official/plugin-dev by Daisy Hollman (Anthropic)*
