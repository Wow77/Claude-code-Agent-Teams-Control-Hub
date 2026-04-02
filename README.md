# Claude Team Dashboard

Real-time visual dashboard for Claude Code teams.

## Install (Anywhere)

### From GitHub (latest)

1. **Clone the repository**

```bash
git clone https://github.com/Wow77/Claude-code-Agent-Teams-Control-Hub.git
cd Claude-code-Agent-Teams-Control-Hub
```

2. **Install dependencies and build**

```bash
npm install
```

This will automatically run `npm run build` via the `prepare` script.

3. **Create global link**

```bash
npm link
```

4. **Run from any folder**

```bash
claude-dashboard
```

Optional with team hint:

```bash
claude-dashboard --team=my-team
```

### From npm (stable)

```bash
npm i -g claude-team-dashboard
claude-dashboard
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
