// Shared library for agent-os: discover source agents, parse them, and
// render them into Claude Code (.md) and OpenAI Codex (.toml) targets.
//
// Source of truth: agents/<domain>/<name>.md
//   Frontmatter keys (single line each):
//     name            required  kebab-case identity (Claude agent name)
//     description     required  routing hint ("Use PROACTIVELY when ...")
//     tools           optional  comma list of Claude tool names (omit = inherit all)
//     model           optional  claude model hint: opus | sonnet | haiku
//     codex_reasoning optional  low | medium | high  -> Codex model_reasoning_effort
//     codex_sandbox   optional  read-only | workspace-write | danger-full-access
//   Body: everything after the second '---' becomes the system prompt.

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const AGENTS_DIR = path.join(ROOT, 'agents');

const CLAUDE_KEYS = ['name', 'description', 'tools', 'model'];

export function toSnake(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// Recursively collect every .md agent file under agents/.
export async function listAgentFiles(dir = AGENTS_DIR) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listAgentFiles(full)));
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
  }
  return out.sort();
}

export function parseAgent(raw, file) {
  const lines = raw.split(/\r?\n/);
  if (lines[0].trim() !== '---') throw new Error(`Missing frontmatter: ${file}`);
  const fm = {};
  let i = 1;
  for (; i < lines.length; i++) {
    if (lines[i].trim() === '---') { i++; break; }
    const line = lines[i];
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    fm[key] = val;
  }
  const body = lines.slice(i).join('\n').trim() + '\n';
  if (!fm.name) throw new Error(`Missing 'name' in ${file}`);
  if (!fm.description) throw new Error(`Missing 'description' in ${file}`);
  const domain = path.basename(path.dirname(file));
  return { fm, body, domain, file };
}

export async function loadAgents() {
  const files = await listAgentFiles();
  const agents = [];
  for (const f of files) agents.push(parseAgent(await readFile(f, 'utf8'), f));
  // Guard against duplicate identities across domains.
  const seen = new Map();
  for (const a of agents) {
    const s = toSnake(a.fm.name);
    if (seen.has(s)) throw new Error(`Duplicate agent name '${a.fm.name}' (${a.file} vs ${seen.get(s)})`);
    seen.set(s, a.file);
  }
  return agents;
}

// ---- renderers ----------------------------------------------------------

export function renderClaude({ fm, body }) {
  const head = ['---'];
  for (const k of CLAUDE_KEYS) if (fm[k]) head.push(`${k}: ${fm[k]}`);
  head.push('---', '');
  return head.join('\n') + body;
}

function tomlEscape(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function renderCodex({ fm, body }) {
  const name = toSnake(fm.name);
  const out = [];
  out.push(`name = "${name}"`);
  out.push(`description = "${tomlEscape(fm.description)}"`);
  if (fm.model_reasoning || fm.codex_reasoning) {
    out.push(`model_reasoning_effort = "${fm.codex_reasoning || fm.model_reasoning}"`);
  }
  if (fm.codex_sandbox) out.push(`sandbox_mode = "${fm.codex_sandbox}"`);
  out.push('');
  // Literal multiline string ('''): no escape processing, safe for backslashes/paths.
  const safeBody = body.replace(/'''/g, "''\\u0027");
  out.push(`developer_instructions = '''`);
  out.push(safeBody.trimEnd());
  out.push(`'''`);
  out.push('');
  return out.join('\n');
}
