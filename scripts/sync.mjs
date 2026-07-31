// Install the agents into the user's global tool directories:
//   Claude Code -> ~/.claude/agents/<name>.md
//   Codex       -> ~/.codex/agents/<name>.toml
//
// Flags: --claude (only Claude), --codex (only Codex), --dry (print, write nothing).
// Default: install to both.

import { mkdir, writeFile, readdir, unlink, readFile, copyFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ROOT, loadAgents, renderClaude, renderCodex, toSnake } from './lib.mjs';

const args = new Set(process.argv.slice(2));
const dry = args.has('--dry');
const only = args.has('--claude') ? 'claude' : args.has('--codex') ? 'codex' : 'both';
const doClaude = only === 'both' || only === 'claude';
const doCodex = only === 'both' || only === 'codex';

const CLAUDE_DIR = path.join(os.homedir(), '.claude', 'agents');
const CODEX_DIR = path.join(os.homedir(), '.codex', 'agents');
const MARKER = 'agent-os: managed file';
const CLAUDE_TAG = `\n<!-- ${MARKER} — edit the source in the agent-os repo, then re-run \`npm run sync\`. -->\n`;
const CODEX_TAG = `# ${MARKER} — edit the source in the agent-os repo, then re-run \`npm run sync\`.\n`;

const agents = await loadAgents();

// Only ever remove files we previously wrote (they carry MARKER), so hand-made
// agents living in the same directories are never touched.
async function pruneManaged(dir, keep) {
  let names;
  try { names = await readdir(dir); } catch { return; }
  for (const n of names) {
    if (!/\.(md|toml)$/.test(n)) continue;
    const full = path.join(dir, n);
    let content = '';
    try { content = await readFile(full, 'utf8'); } catch { continue; }
    if (content.includes(MARKER) && !keep.has(n)) {
      if (dry) console.log(`  prune ${full}`);
      else await unlink(full);
    }
  }
}

if (doClaude) {
  const keep = new Set(agents.map((a) => `${a.fm.name}.md`));
  if (!dry) await mkdir(CLAUDE_DIR, { recursive: true });
  await pruneManaged(CLAUDE_DIR, keep);
  for (const a of agents) {
    const file = path.join(CLAUDE_DIR, `${a.fm.name}.md`);
    if (dry) console.log(`  claude ${file}`);
    else await writeFile(file, renderClaude(a).trimEnd() + '\n' + CLAUDE_TAG, 'utf8');
  }
  console.log(`claude: ${agents.length} agents -> ${CLAUDE_DIR}`);
}

if (doCodex) {
  const keep = new Set(agents.map((a) => `${toSnake(a.fm.name)}.toml`));
  if (!dry) await mkdir(CODEX_DIR, { recursive: true });
  await pruneManaged(CODEX_DIR, keep);
  for (const a of agents) {
    const file = path.join(CODEX_DIR, `${toSnake(a.fm.name)}.toml`);
    if (dry) console.log(`  codex ${file}`);
    else await writeFile(file, CODEX_TAG + renderCodex(a), 'utf8');
  }
  console.log(`codex:  ${agents.length} agents -> ${CODEX_DIR}`);
}

// Install the optional /agent-os router skill for Claude Code.
if (doClaude) {
  const src = path.join(ROOT, 'skill', 'SKILL.md');
  const destDir = path.join(os.homedir(), '.claude', 'skills', 'agent-os');
  const dest = path.join(destDir, 'SKILL.md');
  try {
    await readFile(src, 'utf8');
    if (dry) console.log(`  skill  ${dest}`);
    else { await mkdir(destDir, { recursive: true }); await copyFile(src, dest); }
    console.log(`skill:  /agent-os -> ${destDir}`);
  } catch {
    console.log('skill:  skipped (skill/SKILL.md not found)');
  }
}

console.log(dry ? 'dry run — nothing written.' : 'sync complete.');
