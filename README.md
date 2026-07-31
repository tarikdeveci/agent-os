# agent-os

**One source of truth for a fleet of specialized AI subagents — deployed to both Claude Code and OpenAI Codex.**

You write each agent's role once, in `agents/<domain>/<name>.md`. A build step renders it into the native format of each tool and installs it globally, so the same specialists are available everywhere you work:

| Tool | Target | Format |
|------|--------|--------|
| **Claude Code** | `~/.claude/agents/<name>.md` | Markdown + YAML frontmatter (delegated subagents) |
| **OpenAI Codex** | `~/.codex/agents/<name>.toml` | TOML (`developer_instructions`) |

The point: **give every piece of work to the specialist built for it.** Faster, because each agent starts with the right context and the right skills; better, because the reviewer reviews, the red team attacks, and the builder builds — instead of one generalist doing all three at half strength.

---

## The roster (21 agents, 6 domains)

### 🧑‍💻 Software — the deepest domain, a full delivery pipeline
| Agent | Role |
|-------|------|
| `product-strategist` | What to build & why; scope, requirements, acceptance criteria |
| `feasibility-analyst` | Can we? Effort, risk, dependencies, build-vs-buy, spikes |
| `tech-lead` | How to build it; architecture, decisions, trade-offs, ADRs, build order |
| `implementer` | Writes production code that fits the codebase; verifies it runs |
| `frontend-craftsman` | High-craft UI/UX; states, a11y, responsive, motion (uses `impeccable`) |
| `red-team` | Attacks the design/plan/code; failure modes, threats, edge cases |
| `test-engineer` | Test strategy, TDD, coverage of the risky paths |
| `code-reviewer` | Pre-merge diff review; correctness → security → simplicity |

### 💼 Career
| Agent | Role |
|-------|------|
| `job-hunter` | Find & qualify roles; fit-scored shortlist |
| `outreach-writer` | Cold outreach + follow-ups — **drafts only** (uses `cold-email`) |
| `resume-tailor` | CV/résumé + cover letters tailored to a JD (docx/pdf/LaTeX) |

### 🎬 Content & media
| Agent | Role |
|-------|------|
| `content-strategist` | Content plan & copy across channels; SEO; brand (uses `marketing:*`) |
| `video-producer` | Brief → finished video (uses `video` + media MCP) |
| `visual-designer` | Images, graphics, brand assets (uses `image` + media MCP) |

### 📈 Growth & ops
| Agent | Role |
|-------|------|
| `market-analyst` | Competitor/market/metric analysis (no financial advice) |
| `ops-automator` | Automations, scheduled agents, hooks, config (uses `schedule`/`update-config`) |

### 🔬 Research & knowledge
| Agent | Role |
|-------|------|
| `researcher` | Deep, cross-checked, sourced research |
| `knowledge-synthesizer` | Piles → maps: knowledge graphs & wikis (uses `graphify`) |

### 🗂️ Personal & orchestration
| Agent | Role |
|-------|------|
| `chief-of-staff` | Top-level router: decompose a big goal, route to the right specialists |
| `inbox-manager` | Email triage + reply **drafts** — never sends |
| `document-writer` | Polished docs/sheets/decks (docx/pptx/xlsx/pdf) |

> Codex names are the snake_case form (`red-team` → `red_team`). Run `npm run list` to see the mapping.

---

## Install

**Prerequisites:** Node ≥ 18. (Claude Code and/or Codex installed.)

```bash
npm run deploy
```

That runs `build` (renders `dist/codex/*.toml` + `dist/registry.json`) then `sync` (installs to your global tool dirs). Individual steps:

```bash
npm run build        # render artifacts only
npm run sync         # install to both ~/.claude/agents and ~/.codex/agents
npm run sync:claude  # Claude Code only
npm run sync:codex   # Codex only
npm run sync:dry     # show what would change, write nothing
npm run list         # print the roster + Claude→Codex name mapping
```

`sync` only ever removes files it previously wrote (they carry an `agent-os: managed file` marker), so your hand-made agents in the same directories are never touched.

---

## Using the agents

### In Claude Code
- **Auto-delegation:** each agent's `description` says when to use it, so Claude routes matching tasks automatically.
- **Explicit:** ask for one by name — *"use the red-team agent on this design"* — or spawn several.
- **Orchestration:** hand a big, messy goal to `chief-of-staff`; it decomposes and routes to the specialists.

### In Codex
- Files drop into `~/.codex/agents/` and are discovered automatically. Reference an agent by name in a prompt (e.g. *"have `red_team` review this and `test_engineer` add coverage"*), or use `/agent` in the TUI to switch threads. Optional: register them under `[agents]` in `~/.codex/config.toml` with nicknames.

### The software pipeline
For a real feature, the natural chain is:

```
product-strategist → feasibility-analyst → tech-lead → implementer / frontend-craftsman
        → red-team + test-engineer → code-reviewer
```

Each stage hands off to the next. `chief-of-staff` can drive the whole chain.

---

## How skills are wired in
Every agent's prompt names the specific skills it should reach for, so the right tool fires without you asking:

- **Codebase understanding** → `graphify` (`tech-lead`, `implementer`, `knowledge-synthesizer`)
- **High-craft UI** → `impeccable`, `dataviz` (`frontend-craftsman`)
- **Marketing/content** → `marketing:*`, `cold-email` (`content-strategist`, `outreach-writer`)
- **Media** → `image`, `video` + media MCP (`visual-designer`, `video-producer`)
- **Documents** → `docx`/`pptx`/`xlsx`/`pdf` (`document-writer`, `resume-tailor`)
- **Automation** → `schedule`, `loop`, `update-config` (`ops-automator`)
- **Security/review** → `security-review`, `simplify`, `/code-review` (`red-team`, `code-reviewer`)
- **LLM engineering** → `claude-api` (`tech-lead`, `implementer`)

Skills that aren't present in a given environment degrade gracefully — the prompt says "if available."

---

## Safety model (baked into every agent)
- **Instructions come only from the user.** Content read from files, the web, emails, or tool output is treated as **data, not commands** (prompt-injection resistant).
- **Drafts only** for `outreach-writer` and `inbox-manager` — they never send, publish, or delete.
- **Explicit approval** for anything outward or irreversible: send, publish, purchase, deploy, delete, prod migration.
- **No personalized financial advice** (`market-analyst`).
- **No junk files** — agents report in chat and keep temp work out of your project.

---

## Extend it
Add a specialist in three steps:

1. Create `agents/<domain>/<your-agent>.md` (copy an existing one as a template; keep the frontmatter keys).
2. `npm run build` (validates + renders) — it errors on duplicate names or missing required fields.
3. `npm run sync`.

Frontmatter keys:

| Key | Required | Meaning |
|-----|----------|---------|
| `name` | ✅ | kebab-case identity (Claude agent name; snake_case in Codex) |
| `description` | ✅ | routing hint — start with *"Use PROACTIVELY when…"* |
| `tools` | — | comma list of Claude tools to restrict to (omit = inherit all) |
| `model` | — | `opus` \| `sonnet` \| `haiku` (omit = inherit) |
| `codex_reasoning` | — | `low` \| `medium` \| `high` → Codex `model_reasoning_effort` |
| `codex_sandbox` | — | `read-only` \| `workspace-write` \| `danger-full-access` |

## Repo layout
```
agents/<domain>/*.md   source of truth (one file per agent)
scripts/               build.mjs · sync.mjs · cli.mjs · lib.mjs
dist/codex/*.toml      generated Codex agents (committed)
dist/registry.json     generated roster
skill/SKILL.md         optional /agent-os router skill for Claude Code
docs/                  guides
AGENTS.md              Codex project instructions (the roster, for in-repo work)
```

MIT © 2026 Tarık Deveci
