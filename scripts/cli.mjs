#!/usr/bin/env node
// Tiny CLI: `agent-os list` prints the roster grouped by domain.
import { loadAgents, toSnake } from './lib.mjs';

const cmd = process.argv[2] || 'list';

if (cmd === 'list') {
  const agents = await loadAgents();
  const byDomain = {};
  for (const a of agents) (byDomain[a.domain] ||= []).push(a);
  console.log(`agent-os — ${agents.length} agents\n`);
  for (const domain of Object.keys(byDomain).sort()) {
    console.log(`  ${domain.toUpperCase()}`);
    for (const a of byDomain[domain].sort((x, y) => x.fm.name.localeCompare(y.fm.name))) {
      const claude = a.fm.name;
      const codex = toSnake(a.fm.name);
      console.log(`    - ${claude}  (codex: ${codex})`);
    }
    console.log('');
  }
} else {
  console.log('usage: agent-os list');
  process.exit(1);
}
