# `/dashboard` Command Template

Use this document to expose a one-command dashboard launcher inside Claude.

## Option A: Custom Slash Command (recommended)

If your Claude setup supports local command registration, create a `/dashboard` command that calls the global CLI.

### 1) Register command in your command index

```ts
// commands.ts
import dashboard from './commands/dashboard/index.js'

export const COMMANDS = [
  // ...other commands
  dashboard,
]
```

### 2) Command implementation

```ts
// commands/dashboard/index.ts
import { spawn } from 'child_process'

export default {
  type: 'local-jsx',
  name: 'dashboard',
  description: 'Open Claude Team Dashboard',

  async render() {
    // Optional: replace with your current team resolver
    const teamName = process.env.CLAUDE_TEAM_NAME

    const args = ['--team=' + teamName].filter(Boolean)

    spawn('claude-dashboard', args, {
      detached: true,
      stdio: 'ignore',
    }).unref()

    return <Text>Dashboard launching...</Text>
  },
}
```

Then inside Claude you can call:

```text
/dashboard
```

## Option B: Skill fallback

If slash command registration is not available, use a Skill entrypoint and map it to `/dashboard`.

```yaml
name: dashboard
description: Open Claude Team Dashboard
entrypoint: |
  claude-dashboard
```

## Team-specific launch examples

```bash
claude-dashboard --team=my-team
```

## Notes

- Publish package first so all users can run `claude-dashboard` globally.
- Keep command body thin: only call CLI, do not duplicate dashboard startup logic.
