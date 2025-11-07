# Security Measures

## Sandbox Execution

The MCP executor implements multiple layers of security to safely execute untrusted code:

### 1. Code Validation

- **Pattern Blocking**: Dangerous patterns are blocked before execution:
  - `Deno.run`, `Deno.spawn`, `Deno.Command` (process execution)
  - `eval()`, `Function()` (arbitrary code execution)
  - Dynamic imports `import()`
  - Prototype pollution (`__proto__`, `constructor[`)

- **Size Limits**: Code size is checked against memory limits to prevent resource exhaustion

### 2. Isolated Execution Environment

- Code runs in a limited scope with restricted APIs
- Only safe globals are exposed:
  - Console (logging only)
  - JSON utilities
  - Math and Date
  - Safe data structures (Array, Object, Map, Set)

- No access to:
  - File system (except through MCP tools)
  - Network (except through MCP tools)
  - Process spawning
  - System commands

### 3. Resource Limits

**Timeout Protection**:

- Default: 30 seconds per execution
- Configurable per task
- Automatic termination on timeout

**Memory Limits**:

- Default: 50MB per execution
- Prevents memory exhaustion attacks
- Tracked and reported in execution stats

**Concurrent Task Limits**:

- Maximum concurrent tasks: 5 (default)
- Prevents resource starvation
- Queue-based task management

### 4. MCP Tool Access Control

All MCP tool calls are:

- Logged and tracked
- Routed through the orchestrator
- Subject to rate limiting (future enhancement)
- Auditable via execution stats

### 5. Deno Permissions

When running the orchestrator, use minimal permissions:

```bash
# Development (more permissive)
deno run --allow-read --allow-write=./skills --no-prompt runtime/orchestrator/main.ts

# Production (recommended)
deno run \
  --allow-read=./servers,./skills \
  --allow-write=./skills \
  --allow-net=api.supabase.com,api.github.com \
  --no-prompt \
  runtime/orchestrator/main.ts
```

### 6. Skill Persistence Security

- Skills are stored as plain text TypeScript files
- Read-only loading by default
- Write access limited to skills directory only
- Metadata validation on load

## Best Practices

1. **Always use sandbox mode** in production
2. **Review generated code** before saving as skills
3. **Set appropriate timeouts** based on task complexity
4. **Monitor execution stats** for anomalies
5. **Regularly audit skills** for security issues
6. **Use least-privilege permissions** when running Deno

## Future Enhancements

- [ ] Rate limiting for MCP tool calls
- [ ] Network egress filtering
- [ ] Code signing for skills
- [ ] Execution quotas per user/session
- [ ] Advanced static analysis
- [ ] Runtime behavior monitoring
- [ ] Audit logging to external system
- [ ] Sandboxing with Deno Deploy or containers

## Reporting Security Issues

If you discover a security vulnerability, please report it to the project maintainers immediately. Do not create public issues for security concerns.
