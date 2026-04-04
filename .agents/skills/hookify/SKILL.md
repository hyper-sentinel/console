---
name: hookify
description: Create custom validation rules and guardrails that watch for unwanted behaviors in code changes. Use when you need to enforce coding patterns, block dangerous operations, or set up project-specific rules.
---

# Hookify Skill — Custom Guardrails

Create lightweight validation rules that watch for unwanted behaviors and enforce coding standards. Instead of complex configuration, use simple markdown rule files.

## When to Use
- Enforcing project-specific coding patterns
- Blocking dangerous operations (rm -rf, eval, etc.)
- Warning about debug code left in production
- Requiring tests before completion
- Preventing hardcoded secrets

---

## Rule Format

Rules are defined as markdown files with YAML frontmatter:

```markdown
---
name: <rule-name>
enabled: true
event: bash | file | stop | prompt | all
pattern: <regex-pattern>
action: warn | block
---

<Message to display when rule triggers>
```

### Fields
- **name**: Unique identifier for the rule
- **enabled**: `true` or `false` to toggle
- **event**: What triggers the rule
  - `bash` — Shell commands
  - `file` — File edits and writes
  - `stop` — When the agent wants to stop
  - `prompt` — User prompt submission
  - `all` — Everything
- **pattern**: Python/JS regex to match against
- **action**: `warn` (allow but show message) or `block` (prevent operation)

---

## Example Rules

### Block Dangerous Commands
```markdown
---
name: block-destructive-ops
enabled: true
event: bash
pattern: rm\s+-rf|dd\s+if=|mkfs|format
action: block
---

🛑 **Destructive operation detected!**
This command can cause data loss. Operation blocked for safety.
```

### Warn About Debug Code
```markdown
---
name: warn-debug-code
enabled: true
event: file
pattern: console\.log\(|debugger;|print\(
action: warn
---

🐛 **Debug code detected**
Remember to remove debugging statements before committing.
```

### Block Hardcoded Secrets
```markdown
---
name: block-hardcoded-secrets
enabled: true
event: file
pattern: (API_KEY|SECRET|TOKEN)\s*=\s*["'][a-zA-Z0-9]
action: block
---

🔐 **Hardcoded credential detected!**
Use environment variables instead of hardcoded values.
```

### Require Tests
```markdown
---
name: require-tests
enabled: false
event: stop
action: block
---

**Tests not detected!**
Before stopping, please run tests to verify your changes work correctly.
```

---

## Advanced: Multiple Conditions

```yaml
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.tsx?$
  - field: new_text
    operator: contains
    pattern: API_KEY
```

**Operators:** `regex_match`, `contains`, `equals`, `not_contains`, `starts_with`, `ends_with`

**Fields by event:**
- bash: `command`
- file: `file_path`, `new_text`, `old_text`, `content`
- prompt: `user_prompt`

---

## Pattern Cheat Sheet

| Pattern | Matches | Example |
|---------|---------|---------|
| `rm\s+-rf` | rm -rf | rm -rf /tmp |
| `console\.log\(` | console.log( | console.log("test") |
| `(eval\|exec)\(` | eval( or exec( | eval("code") |
| `\.env$` | files ending in .env | .env, .env.local |
| `chmod\s+777` | chmod 777 | chmod 777 file.txt |

---

*Ported from claude-plugins-official/hookify (Anthropic)*
