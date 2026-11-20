import { Client } from '@modelcontextprotocol/client';
import { getDefaultEnvironment, StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const cli = fileURLToPath(new URL('../src/cli.ts', import.meta.url));

describe('stdio round-trip with the SDK client', () => {
  let client: Client;
  let transport: StdioClientTransport;
  let stderr = '';

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: process.execPath,
      args: [cli],
      env: getDefaultEnvironment(),
      stderr: 'pipe',
    });
    transport.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    client = new Client({ name: 'stdio-test', version: '1.0.0' });
    await client.connect(transport);
  });

  afterAll(async () => {
    await client.close();
  });

  it('lists three read-only tools, each with input and output schemas', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(['check_contrast', 'get_token', 'list_roles']);
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.outputSchema?.type).toBe('object');
      expect(tool.annotations?.readOnlyHint).toBe(true);
    }
  });

  it('checks contrast between two roles and returns structured content', async () => {
    const result = await client.callTool({
      name: 'check_contrast',
      arguments: { foreground: '--on-accent', background: '--accent', theme: 'dark' },
    });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({
      theme: 'dark',
      foreground: { role: '--on-accent' },
      background: { role: '--accent' },
      text: { min: 4.5, pass: true },
    });
  });

  it('answers an unknown role with a tool error the model can read', async () => {
    const result = await client.callTool({ name: 'get_token', arguments: { role: 'surfce' } });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain('Did you mean --surface');
  });

  it('logs one JSON line per call to stderr, with argument shapes and no values', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const lines = stderr
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(lines[0]).toMatchObject({ event: 'ready', themes: ['light', 'dark'] });
    const calls = lines.filter((line) => line.event === 'tool_call');
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({
      tool: 'check_contrast',
      ok: true,
      args: { foreground: 'string(11)', background: 'string(8)', theme: 'string(4)' },
    });
    expect(calls[1]).toMatchObject({ tool: 'get_token', ok: false, error: 'input' });
    expect(typeof calls[0]!.ms).toBe('number');
    expect(stderr).not.toContain('surfce');
    expect(stderr).not.toContain('--on-accent');
  });
});
