/**
 * Checks the kit's agent files before they ship.
 *
 *   node scripts/validate-kit.ts            frontmatter, relative links, manifests (offline)
 *   node scripts/validate-kit.ts --links    also fetch every angular.dev link (cached for 7 days in .cache/)
 *   node scripts/validate-kit.ts --links --refresh   ignore the cache
 *
 * Exits 1 and lists every problem when something is wrong.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { parse as parseYaml } from 'yaml';

export const ROOT = resolve(import.meta.dirname, '..');

export interface Problem {
  file: string;
  message: string;
}

export interface Doc {
  file: string;
  data: Record<string, unknown>;
  body: string;
}

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Hosts the skill and agent may link to: the Angular docs, current and archived per major. */
const ALLOWED_HOST = /^(?:v\d+\.)?angular\.dev$/;
const MARKDOWN_LINK = /\[[^\]]*\]\(([^)\s]+)\)/g;
const BARE_URL = /<(https?:\/\/[^>\s]+)>|(?<![(<])\bhttps?:\/\/[^\s)>\]`'"]+/g;

/** Splits `---` YAML frontmatter from the Markdown body. */
export function readDoc(file: string): Doc {
  const text = readFileSync(file, 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { file, data: {}, body: text };
  const data = parseYaml(match[1]!) as unknown;
  return {
    file,
    data: data && typeof data === 'object' ? (data as Record<string, unknown>) : {},
    body: match[2]!,
  };
}

/** Every link in a Markdown text: `[text](target)` targets and bare URLs, code blocks left out. */
export function linksIn(markdown: string): string[] {
  const prose = markdown.replace(/```[\s\S]*?```/g, '');
  const links = [...prose.matchAll(MARKDOWN_LINK)].map((m) => m[1]!);
  const withoutMarkdownLinks = prose.replace(MARKDOWN_LINK, '');
  for (const m of withoutMarkdownLinks.matchAll(BARE_URL)) links.push(m[1] ?? m[0]);
  return links;
}

function listFiles(dir: string, keep: (name: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && keep(entry.name))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
}

function checkDescription(problems: Problem[], file: string, description: unknown) {
  if (typeof description !== 'string' || description.trim().length < 40) {
    problems.push({ file, message: 'description is missing or shorter than 40 characters' });
    return;
  }
  if (description.length > 1024) {
    problems.push({
      file,
      message: `description is ${description.length} characters; the limit is 1024`,
    });
  }
  if (!/\bUse (when|proactively)\b/.test(description)) {
    problems.push({ file, message: 'description should say when to use it ("Use when ...")' });
  }
  // eslint-disable-next-line no-control-regex
  if (/[^\x00-\x7f]/.test(description)) {
    problems.push({ file, message: 'description has non-ASCII characters (APM warns about them)' });
  }
}

function checkLinks(problems: Problem[], doc: Doc, urls: Set<string>) {
  for (const link of linksIn(doc.body)) {
    if (/^https?:\/\//.test(link)) {
      const url = new URL(link);
      if (!ALLOWED_HOST.test(url.hostname)) {
        problems.push({ file: doc.file, message: `links outside angular.dev: ${link}` });
      }
      urls.add(link);
    } else if (!link.startsWith('#') && !link.startsWith('mailto:')) {
      const target = resolve(dirname(doc.file), link.split('#')[0]!);
      if (!existsSync(target))
        problems.push({ file: doc.file, message: `broken relative link: ${link}` });
    }
  }
}

export function validateSkill(skillDir: string, problems: Problem[], urls: Set<string>) {
  const file = join(skillDir, 'SKILL.md');
  if (!existsSync(file)) {
    problems.push({ file: skillDir, message: 'no SKILL.md' });
    return;
  }
  const doc = readDoc(file);
  const name = doc.data.name;
  if (name !== basename(skillDir)) {
    problems.push({
      file,
      message: `name "${String(name)}" must equal the folder name "${basename(skillDir)}"`,
    });
  }
  if (typeof name !== 'string' || !KEBAB.test(name) || name.length > 64) {
    problems.push({ file, message: 'name must be kebab-case, at most 64 characters' });
  }
  checkDescription(problems, file, doc.data.description);
  checkLinks(problems, doc, urls);

  // Every reference file is named in SKILL.md, and every reference SKILL.md names exists.
  const mentioned = new Set(
    [...doc.body.matchAll(/`(references\/[\w./-]+\.md)`/g)].map((m) => m[1]!),
  );
  for (const ref of mentioned) {
    if (!existsSync(join(skillDir, ref)))
      problems.push({ file, message: `points to missing ${ref}` });
  }
  for (const refFile of listFiles(join(skillDir, 'references'), (n) => n.endsWith('.md'))) {
    const ref = relative(skillDir, refFile).replaceAll('\\', '/');
    if (!mentioned.has(ref))
      problems.push({ file, message: `${ref} is never mentioned, so agents will not find it` });
    const refDoc = readDoc(refFile);
    checkLinks(problems, refDoc, urls);
    if (!linksIn(refDoc.body).some((l) => l.includes('angular.dev'))) {
      problems.push({
        file: refFile,
        message: 'has no angular.dev link: every rule needs its source',
      });
    }
  }
}

export function validateAgent(
  file: string,
  skillNames: Set<string>,
  problems: Problem[],
  urls: Set<string>,
) {
  const doc = readDoc(file);
  const stem = basename(file).replace(/\.agent\.md$/, '');
  if (!file.endsWith('.agent.md')) {
    problems.push({ file, message: 'agent files end in .agent.md (Copilot reads only those)' });
  }
  if (doc.data.name !== stem)
    problems.push({ file, message: `name must equal the file stem "${stem}"` });
  checkDescription(problems, file, doc.data.description);
  const skills = doc.data.skills;
  if (skills !== undefined) {
    if (!Array.isArray(skills)) problems.push({ file, message: 'skills must be a list' });
    else
      for (const skill of skills)
        if (!skillNames.has(String(skill)))
          problems.push({ file, message: `preloads unknown skill "${skill}"` });
  }
  if ('tools' in doc.data) {
    problems.push({
      file,
      message: 'tools: tool names differ between Claude Code and Copilot; use disallowedTools',
    });
  }
  checkLinks(problems, doc, urls);
}

export function validateManifests(root: string, problems: Problem[]) {
  const pluginFile = join(root, '.claude-plugin/plugin.json');
  const marketFile = join(root, '.claude-plugin/marketplace.json');
  const mcpFile = join(root, '.mcp.json');
  const apmFile = join(root, 'apm.yml');
  const serverPkgFile = join(root, 'packages/design-tokens-mcp/package.json');
  const plugin = readJson(pluginFile);
  const market = readJson(marketFile);
  const apm = parseYaml(readFileSync(apmFile, 'utf8')) as Record<string, unknown>;
  const serverPkg = readJson(serverPkgFile);
  const entries = (market.plugins ?? []) as { name: string; source: unknown }[];

  if (!entries.some((p) => p.name === plugin.name && p.source === './')) {
    problems.push({
      file: marketFile,
      message: `no entry named "${String(plugin.name)}" with source "./"`,
    });
  }
  if (apm.name !== plugin.name)
    problems.push({ file: apmFile, message: 'name differs from plugin.json' });
  if (apm.version !== plugin.version)
    problems.push({ file: apmFile, message: 'version differs from plugin.json' });
  for (const key of ['dependencies', 'devDependencies', 'includes']) {
    if (key in apm) {
      problems.push({
        file: apmFile,
        message: `keep apm.yml metadata-only: "${key}" makes APM skip the plugin layout`,
      });
    }
  }
  if (existsSync(join(root, '.apm'))) {
    problems.push({
      file: join(root, '.apm'),
      message: 'a .apm/ folder makes APM skip the plugin layout',
    });
  }

  const servers = (readJson(mcpFile).mcpServers ?? {}) as Record<string, { args?: string[] }>;
  const pinned = `${String(serverPkg.name)}@${String(serverPkg.version)}`;
  if (!Object.values(servers).some((s) => s.args?.includes(pinned))) {
    problems.push({
      file: mcpFile,
      message: `no server runs ${pinned}; update the pin with the package version`,
    });
  }
}

/* --------------------------------------------------------------- link check */

interface CacheEntry {
  ok: boolean;
  detail: string;
  checkedAt: string;
}

const CACHE_FILE = join(ROOT, '.cache/angular-links.json');
const CACHE_DAYS = 7;

/** Fetches one angular.dev page. The site answers 200 for any path, so the title and the anchor are checked too. */
export async function checkAngularLink(link: string): Promise<{ ok: boolean; detail: string }> {
  const url = new URL(link);
  const page = `${url.origin}${url.pathname}`;
  let response: Response;
  try {
    response = await fetch(page, { redirect: 'follow', signal: AbortSignal.timeout(20_000) });
  } catch (error) {
    return { ok: false, detail: `request failed: ${(error as Error).message}` };
  }
  if (response.status !== 200) return { ok: false, detail: `HTTP ${response.status}` };
  const html = await response.text();
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? '';
  if (/^Redirecting/i.test(title))
    return { ok: false, detail: 'redirects: link the final page instead' };
  if (title === 'Home • Angular' && url.pathname !== '/')
    return { ok: false, detail: 'unknown page (site home)' };
  const anchor = decodeURIComponent(url.hash.slice(1));
  if (anchor && !html.includes(`id="${anchor}"`))
    return { ok: false, detail: `no #${anchor} on the page` };
  return { ok: true, detail: title };
}

async function checkUrls(urls: string[], refresh: boolean): Promise<Problem[]> {
  const cache: Record<string, CacheEntry> =
    !refresh && existsSync(CACHE_FILE)
      ? (readJson(CACHE_FILE) as unknown as Record<string, CacheEntry>)
      : {};
  const fresh = (entry?: CacheEntry) =>
    entry?.ok && Date.now() - Date.parse(entry.checkedAt) < CACHE_DAYS * 86_400_000;
  const todo = urls.filter((u) => !fresh(cache[u]));
  const queue = [...todo];
  const worker = async () => {
    for (let link = queue.shift(); link; link = queue.shift()) {
      const result = await checkAngularLink(link);
      cache[link] = { ...result, checkedAt: new Date().toISOString() };
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  mkdirSync(dirname(CACHE_FILE), { recursive: true });
  writeFileSync(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`);
  console.log(
    `angular.dev links: ${urls.length} unique, ${todo.length} fetched, ${urls.length - todo.length} cached.`,
  );
  return urls.filter((u) => !cache[u]!.ok).map((u) => ({ file: u, message: cache[u]!.detail }));
}

/* --------------------------------------------------------------------- main */

export function validateKit(root = ROOT): {
  problems: Problem[];
  urls: Set<string>;
  counted: string;
} {
  const problems: Problem[] = [];
  const urls = new Set<string>();
  const skillDirs = readdirSync(join(root, 'skills'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(root, 'skills', d.name));
  for (const dir of skillDirs) validateSkill(dir, problems, urls);
  const skillNames = new Set(skillDirs.map((d) => basename(d)));
  const agents = listFiles(join(root, 'agents'), (n) => n.endsWith('.md'));
  for (const file of agents) validateAgent(file, skillNames, problems, urls);
  validateManifests(root, problems);
  return { problems, urls, counted: `${skillDirs.length} skills, ${agents.length} agents` };
}

async function main() {
  const { values } = parseArgs({
    options: { links: { type: 'boolean' }, refresh: { type: 'boolean' } },
  });
  const { problems, urls, counted } = validateKit();
  if (values.links) problems.push(...(await checkUrls([...urls].sort(), values.refresh ?? false)));
  if (problems.length) {
    console.error(`${problems.length} problem(s):`);
    for (const p of problems)
      console.error(`- ${p.file.startsWith('/') ? relative(ROOT, p.file) : p.file}: ${p.message}`);
    process.exit(1);
  }
  console.log(
    `Kit OK: ${counted}, ${urls.size} angular.dev links${values.links ? ' answer' : ' (not fetched)'}.`,
  );
}

if (import.meta.main) await main();
