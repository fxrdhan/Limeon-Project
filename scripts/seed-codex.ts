/// <reference types="node" />

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const EXA_TOOLS = [
  'web_search_exa',
  'web_search_advanced_exa',
  'get_code_context_exa',
  'crawling_exa',
  'company_research_exa',
  'people_search_exa',
  'deep_researcher_start',
  'deep_researcher_check',
  'deep_search_exa',
].join(',');

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const codexDir = path.join(repoRoot, '.codex');
const templatePath = path.join(codexDir, 'config.toml.example');
const targetPath = path.join(codexDir, 'config.toml');
const force = process.argv.includes('--force');

const escapeTomlString = (value: string) => JSON.stringify(value);

const resolveExaMcpUrl = () => {
  const exaApiKey = process.env.EXA_API_KEY?.trim();
  const baseUrl = 'https://mcp.exa.ai/mcp';

  if (!exaApiKey) {
    return `${baseUrl}?tools=${EXA_TOOLS}`;
  }

  return `${baseUrl}?exaApiKey=${encodeURIComponent(exaApiKey)}&tools=${EXA_TOOLS}`;
};

const seedCodexConfig = async () => {
  if (!force && existsSync(targetPath)) {
    console.log(
      'Skipping .codex/config.toml because it already exists. Use --force to overwrite it.'
    );
    return;
  }

  const template = await readFile(templatePath, 'utf8');
  const config = template.replace(
    '__EXA_MCP_URL__',
    escapeTomlString(resolveExaMcpUrl())
  );

  await mkdir(codexDir, { recursive: true });
  await writeFile(targetPath, config);

  console.log(
    `${force ? 'Updated' : 'Created'} .codex/config.toml from .codex/config.toml.example`
  );

  if (!process.env.EXA_API_KEY?.trim()) {
    console.log(
      'EXA_API_KEY is not set, so Exa MCP was seeded with the anonymous remote URL.'
    );
  }

  console.log(
    'Supabase and Firecrawl MCP tokens are forwarded from shell env vars when available.'
  );
};

await seedCodexConfig();
