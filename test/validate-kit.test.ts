import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { linksIn, ROOT, validateKit } from '../scripts/validate-kit.ts';

describe('the kit in this repository', () => {
  it('passes every offline check', () => {
    const { problems, urls } = validateKit();
    expect(problems).toEqual([]);
    expect(urls.size).toBeGreaterThan(50);
  });
});

describe('linksIn', () => {
  it('finds Markdown links and bare URLs, and skips code blocks', () => {
    const md = [
      'See [signals](https://angular.dev/guide/signals) and <https://angular.dev/guide/zoneless>.',
      'Also [a file](references/x.md).',
      '```sh',
      'curl https://example.com/ignored',
      '```',
    ].join('\n');
    expect(linksIn(md)).toEqual([
      'https://angular.dev/guide/signals',
      'references/x.md',
      'https://angular.dev/guide/zoneless',
    ]);
  });
});

describe('broken kits', () => {
  let dir: string;
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  function copyKit(): string {
    dir = mkdtempSync(join(tmpdir(), 'kit-'));
    for (const path of [
      'skills',
      'agents',
      '.claude-plugin',
      '.mcp.json',
      'apm.yml',
      'packages/design-tokens-mcp/package.json',
    ]) {
      cpSync(join(ROOT, path), join(dir, path), { recursive: true });
    }
    return dir;
  }

  it('reports a wrong name, a missing "Use when", a foreign link and an orphan reference', () => {
    const kit = copyKit();
    writeFileSync(
      join(kit, 'skills/modern-angular/SKILL.md'),
      '---\nname: angular\ndescription: A skill about Angular that is long enough to pass the length check.\n---\n\nSee [a blog](https://example.com/post).\n',
    );
    const messages = validateKit(kit).problems.map((p) => p.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        'name "angular" must equal the folder name "modern-angular"',
        'description should say when to use it ("Use when ...")',
        'links outside angular.dev: https://example.com/post',
        'references/signals.md is never mentioned, so agents will not find it',
      ]),
    );
  });

  it('reports an apm.yml that would hide the plugin layout, and a stale MCP pin', () => {
    const kit = copyKit();
    writeFileSync(
      join(kit, 'apm.yml'),
      'name: angular-agent-kit\nversion: 0.1.0\ndependencies:\n  apm: []\n',
    );
    writeFileSync(
      join(kit, '.mcp.json'),
      '{"mcpServers":{"x":{"command":"npx","args":["-y","@a.incantalupo/design-tokens-mcp@0.0.1"]}}}',
    );
    const messages = validateKit(kit).problems.map((p) => p.message);
    expect(messages.some((m) => m.includes('metadata-only'))).toBe(true);
    expect(messages.some((m) => m.includes('update the pin'))).toBe(true);
  });
});
