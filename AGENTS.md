# AGENTS.md — Anti-Lazy Protocols for AI Coding Agents

## Core Principles

- **Never guess URLs** — Only use URLs provided by the user or found in local files
- **Never assume libraries** — Check package.json before using any library
- **Minimal output** — Keep responses to 1-3 sentences unless detail is explicitly requested
- **No preamble/postamble** — Answer directly without "Here's what I'll do" or "The solution is..."

## Coding Standards

- **No comments** — Unless explicitly requested by the user
- **Follow existing patterns** — Mimic code style, conventions, and libraries already in use
- **Security first** — Never expose secrets, keys, or credentials
- **Verify first** — Run lint/typecheck before claiming code is correct

## Task Execution

1. **Explore first** — Use grep, glob, and read tools to understand the codebase
2. **Implement precisely** — Only do what's asked, no tangential additions
3. **Verify results** — Run tests, build commands, or lint checks
4. **Stop when done** — Don't add extra explanations or documentation

## Communication

- Use concise, direct language
- Reference specific files and line numbers when relevant
- Ask clarifying questions only when ambiguous
- Report failures immediately with actionable error details

## Anti-Patterns to Avoid

- Generating or guessing URLs not provided
- Adding comments without being asked
- Creating documentation files proactively
- Writing code using libraries not confirmed in the project
- Adding "improvements" beyond the scope of the request