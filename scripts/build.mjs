// Build committed artifacts from the source agents:
//   dist/codex/<name>.toml   ready-to-use Codex agent files
//   dist/registry.json       machine-readable roster (name, domain, description)
// Claude Code consumes the source agents/*.md directly, so no Claude dist is needed.

import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, loadAgents, renderCodex, toSnake } from './lib.mjs';

const CODEX_OUT = path.join(ROOT, 'dist', 'codex');

const agents = await loadAgents();
await rm(path.join(ROOT, 'dist'), { recursive: true, force: true });
await mkdir(CODEX_OUT, { recursive: true });

const registry = [];
for (const a of agents) {
  const snake = toSnake(a.fm.name);
  await writeFile(path.join(CODEX_OUT, `${snake}.toml`), renderCodex(a), 'utf8');
  registry.push({
    name: a.fm.name,
    codex_name: snake,
    domain: a.domain,
    model: a.fm.model || 'inherit',
    description: a.fm.description,
  });
}

registry.sort((x, y) => x.domain.localeCompare(y.domain) || x.name.localeCompare(y.name));
await writeFile(path.join(ROOT, 'dist', 'registry.json'), JSON.stringify(registry, null, 2) + '\n', 'utf8');

const byDomain = registry.reduce((m, a) => ((m[a.domain] = (m[a.domain] || 0) + 1), m), {});
console.log(`agent-os build: ${agents.length} agents -> dist/codex/*.toml`);
for (const [d, n] of Object.entries(byDomain).sort()) console.log(`  ${d.padEnd(10)} ${n}`);
