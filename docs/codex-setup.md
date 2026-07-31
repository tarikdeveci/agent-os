# Codex setup notes

`npm run sync` (or `npm run sync:codex`) writes one TOML per agent into `~/.codex/agents/`. Codex discovers personal agents there automatically — in most builds nothing else is required.

## Invoking agents
Reference an agent by its snake_case name inside a normal prompt:

> Investigate the failing checkout. Have `red_team` find the failure mode, `tech_lead` decide the fix, and `implementer` apply the smallest change once the cause is clear.

Or use `/agent` in the TUI to switch between agent threads during a session.

## Optional: register in config.toml
If you want explicit registration, nicknames, or concurrency limits, add to `~/.codex/config.toml`:

```toml
[agents]
max_threads = 6          # cap parallel subagents
max_depth = 1            # prevent runaway nesting

[agents.red_team]
description = "Adversarial reviewer — attacks designs and code."
config_file = "~/.codex/agents/red_team.toml"
nickname_candidates = ["Sentinel", "Breaker"]
```

`sync` does **not** touch your `config.toml` — registration is opt-in and yours to manage.

## Per-agent knobs already set
- `model_reasoning_effort` — `high` on the deep-thinking agents (`tech_lead`, `red_team`, `feasibility_analyst`, `researcher`, `market_analyst`, `chief_of_staff`, `product_strategist`), `medium` elsewhere.
- `sandbox_mode = "read-only"` — on the review/analysis agents that should never modify files (`red_team`, `code_reviewer`, `feasibility_analyst`, `market_analyst`, `researcher`).

Change these in the source `agents/<domain>/<name>.md` (`codex_reasoning`, `codex_sandbox`), then re-run `npm run build && npm run sync:codex`.

## Model names
The source files intentionally do **not** hard-code a model, so each tool uses its own default (Codex won't inherit a Claude model id). Set a Codex model per agent in `config.toml` if you want one.
