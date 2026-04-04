---
name: security-guidance
description: Security-focused code review and guidance. Automatically validates code changes for common security vulnerabilities including secrets exposure, injection attacks, insecure dependencies, and unsafe practices. Use when writing or reviewing security-sensitive code.
---

# Security Guidance Skill

Proactively identify and prevent security vulnerabilities in code changes. This skill should be applied when writing or reviewing code that handles authentication, user input, API keys, file system operations, or network requests.

## When to Use
- Writing authentication or authorization code
- Handling user input or form data
- Working with API keys, tokens, or secrets
- File system operations
- Network requests and API integrations
- Database queries
- Deploying to production

---

## Security Review Checklist

### 1. Secrets & Credentials
- [ ] No hardcoded API keys, tokens, or passwords in source code
- [ ] Secrets stored in environment variables or secret managers
- [ ] `.env` files listed in `.gitignore`
- [ ] No secrets in commit history (check with `git log -p --all -S 'secret'`)
- [ ] API keys have minimum required permissions
- [ ] Credentials rotated regularly

### 2. Input Validation
- [ ] All user input sanitized before use
- [ ] SQL queries use parameterized queries (never string concatenation)
- [ ] HTML output properly escaped to prevent XSS
- [ ] File paths validated to prevent directory traversal
- [ ] URL inputs validated to prevent SSRF
- [ ] JSON/XML parsers configured to prevent entity expansion attacks

### 3. Authentication & Authorization
- [ ] Passwords hashed with bcrypt/argon2 (never MD5/SHA1)
- [ ] JWT tokens have appropriate expiration
- [ ] Session tokens regenerated on privilege changes
- [ ] Rate limiting on authentication endpoints
- [ ] CORS configured with specific origins (not wildcard)
- [ ] CSRF protection enabled

### 4. Dependencies
- [ ] Dependencies from trusted sources
- [ ] No known vulnerabilities (`npm audit`, `pip audit`)
- [ ] Lock files committed and up to date
- [ ] Minimal dependency surface area

### 5. Network & Transport
- [ ] HTTPS enforced for all external requests
- [ ] TLS certificates validated (no `rejectUnauthorized: false`)
- [ ] Sensitive headers not logged
- [ ] API responses don't leak internal details in errors

### 6. File System & Execution
- [ ] No `eval()` or dynamic code execution with user input
- [ ] File uploads validated for type and size
- [ ] Temporary files cleaned up
- [ ] File permissions set appropriately
- [ ] No shell injection via `exec()`/`spawn()` with user input

---

## Common Vulnerability Patterns

### Pattern: Hardcoded Secret
```
❌ const API_KEY = "sk-ant-abc123..."
✅ const API_KEY = process.env.API_KEY
```

### Pattern: SQL Injection
```
❌ db.query(`SELECT * FROM users WHERE id = ${userId}`)
✅ db.query('SELECT * FROM users WHERE id = $1', [userId])
```

### Pattern: XSS
```
❌ element.innerHTML = userInput
✅ element.textContent = userInput
```

### Pattern: Path Traversal
```
❌ fs.readFile(path.join('/uploads', userPath))
✅ const safePath = path.resolve('/uploads', userPath)
   if (!safePath.startsWith('/uploads/')) throw new Error('Invalid path')
```

### Pattern: Shell Injection
```
❌ exec(`grep ${userInput} file.txt`)
✅ execFile('grep', [userInput, 'file.txt'])
```

---

## Sentinel-Specific Security Concerns

For the Sentinel trading terminal specifically:

1. **API Key Storage**: User LLM API keys must be encrypted at rest and in transit
2. **Trading Operations**: All trade execution must have confirmation safeguards
3. **Wallet Addresses**: Never log or expose full wallet private keys
4. **Rate Limiting**: Protect against API abuse on all authenticated endpoints
5. **Session Management**: JWT tokens must expire, refresh tokens must be rotatable
6. **Stripe Integration**: PCI compliance for billing operations

---

## Automated Checks

When reviewing code, automatically scan for:
- Strings matching API key patterns (`sk-`, `pk_`, `secret_`)
- `eval()`, `Function()`, `exec()` calls
- Direct SQL string concatenation
- `innerHTML` assignments
- Disabled TLS verification
- Overly permissive CORS
- Missing rate limiting on auth routes

---

*Adapted from claude-plugins-official/security-guidance (Anthropic)*
