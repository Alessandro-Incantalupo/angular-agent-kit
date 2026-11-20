/**
 * Starts the server the way an MCP client would and makes two calls over stdio.
 *
 *   node scripts/smoke.ts                                      the server in src/
 *   node scripts/smoke.ts npx -y @a.incantalupo/design-tokens-mcp@0.1.0   any command
 *
 * Prints tools/list, one check_contrast result, and the server's stderr log lines.
 */
import { Client } from '@modelcontextprotocol/client';
import { getDefaultEnvironment, StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { fileURLToPath } from 'node:url';

const [command, ...args] = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [process.execPath, fileURLToPath(new URL('../src/cli.ts', import.meta.url))];

const transport = new StdioClientTransport({
  command: command!,
  args,
  env: getDefaultEnvironment(),
  stderr: 'pipe',
});
let log = '';
transport.stderr?.on('data', (chunk: Buffer) => (log += chunk.toString()));

const client = new Client({ name: 'smoke', version: '1.0.0' });
await client.connect(transport);

const { tools } = await client.listTools();
console.log('tools/list:');
for (const tool of tools) {
  const input = Object.keys((tool.inputSchema.properties ?? {}) as object).join(', ');
  console.log(`  ${tool.name}(${input}) -> outputSchema: ${tool.outputSchema ? 'yes' : 'no'}`);
}

const result = await client.callTool({
  name: 'check_contrast',
  arguments: { foreground: '--text-muted', background: '--surface-sunken', theme: 'dark' },
});
console.log('check_contrast --text-muted on --surface-sunken (dark):');
console.log(JSON.stringify(result.structuredContent, null, 2));

await client.close();
await new Promise((resolve) => setTimeout(resolve, 100));
console.log('server stderr:');
console.log(log.trim());
