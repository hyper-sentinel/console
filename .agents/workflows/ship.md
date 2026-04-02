---
description: How to ship changes to the Sentinel SDK (hyper-sentinel on PyPI). NEVER skip steps.
---

# /ship — Sentinel SDK Release Workflow

> **RULE: Nothing ships without user approval. EVER.**

## Phase 1: Changelog

Before ANY code changes, document what you're about to do:

1. Tell the user EXACTLY what will change and why — in plain English
2. List every file being modified
3. Wait for user acknowledgment before writing code

## Phase 2: Implement

4. Make the code changes
5. Show the user a summary of what was changed (diffs or description)

## Phase 3: Test (MANDATORY — DO NOT SKIP)

6. Install locally with editable mode:
// turbo
```bash
cd ~/Antigravity/Python/sentinel-sdk && pip install -e . 2>&1 | tail -2
```

7. Run the full test suite:
// turbo
```bash
cd ~/Antigravity/Python/sentinel-sdk && python3 -m pytest tests/ -x -v 2>&1
```

8. If ANY test fails → FIX IT before proceeding. Do NOT move on.

9. Test the specific feature you changed. Write a scratch test in /tmp/ that exercises the exact code path:
// turbo
```bash
python3 /tmp/test_<feature>.py
```

10. If you CANNOT automatically test something (e.g., interactive REPL, live API call), tell the user:
    - "I can't test this automatically. Please run `<exact command>` and tell me what you see."
    - STOP and wait for their response.
    - Do NOT proceed until they confirm it works.

## Phase 4: User Approval (MANDATORY — DO NOT SKIP)

11. Present the user with:
    - **What changed** (summary)
    - **Test results** (all passing)
    - **What they should manually verify** (if anything)
    - **Version number** that will ship

12. Ask: **"Ready to ship v{X.Y.Z}?"**

13. **STOP. WAIT for explicit approval.** Do not proceed until the user says yes.

## Phase 5: Ship

Only after explicit user approval:

14. Bump version in BOTH files:
    - `pyproject.toml` → `version = "X.Y.Z"`
    - `src/sentinel/__init__.py` → `__version__ = "X.Y.Z"`

15. Build:
```bash
cd ~/Antigravity/Python/sentinel-sdk && rm -rf dist build && uv build 2>&1 | tail -3
```

16. Publish:
```bash
cd ~/Antigravity/Python/sentinel-sdk && uv publish --token $PYPI_TOKEN 2>&1
```

17. Verify the published version:
```bash
pip install hyper-sentinel --upgrade 2>&1 | tail -3
sentinel --version
```

18. Tell the user: "v{X.Y.Z} is live. Run `pip install hyper-sentinel --upgrade` to get it."

---

## Rules

- **NEVER** ship without running tests
- **NEVER** ship without user saying "yes" / "go" / "ship it"
- **NEVER** bump version before tests pass
- **NEVER** assume something works — test it or ask the user to test it
- If a test can't be automated, the user IS the test. Ask them. Wait.
