# Claude Team Dashboard

Real-time visual dashboard for Claude Code teams.

## Install (Anywhere)

### Global install (recommended)

```bash
npm i -g claude-team-dashboard
```

Then run from any folder:

```bash
claude-dashboard
```

Optional:

```bash
claude-dashboard --team=my-team
```

### No install (quick trial)

```bash
npx claude-team-dashboard
```

## Local Development

```bash
npm install
npm run web:dev
```

- UI: `http://localhost:5173`
- API: `http://localhost:3001`

## Claude `/dashboard` Template

This repo includes a copy-paste template doc for slash command integration:

- [docs/SLASH_COMMAND_TEMPLATE.md](docs/SLASH_COMMAND_TEMPLATE.md)

It contains:

- Custom command style `/dashboard` template
- Skill-style `/dashboard` fallback template
- Team-aware launch examples (`--team=...`)

## Publish To npm (Maintainers)

1. Build and package check:

```bash
npm ci
npm run build
npm pack
```

2. Publish (after npm auth is already configured):

```bash
npm publish --access public
```

3. Verify:

```bash
npx claude-team-dashboard --help
```

## Environment

By default, dashboard reads Claude data from:

- macOS/Linux: `~/.claude`
- Windows: `%USERPROFILE%\\.claude`

If needed, set a custom path before launching:

```bash
# macOS/Linux
CLAUDE_CONFIG_DIR=/path/to/.claude claude-dashboard

# Windows (PowerShell)
$env:CLAUDE_CONFIG_DIR='C:\\Users\\you\\.claude'; claude-dashboard
```

## License

MIT
