/// <reference types="node" />

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
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
const backupPath = path.join(codexDir, 'config.toml.bak');
const force = process.argv.includes('--force');
const interactive = process.argv.includes('--interactive');
const yes = process.argv.includes('--yes');

const escapeTomlString = (value: string) => JSON.stringify(value);
const placeholderPattern = /__[A-Z0-9_]+__/g;

const resolveExaMcpUrl = () => {
  const exaApiKey = process.env.EXA_API_KEY?.trim();
  const baseUrl = 'https://mcp.exa.ai/mcp';

  if (!exaApiKey) {
    return `${baseUrl}?tools=${EXA_TOOLS}`;
  }

  return `${baseUrl}?exaApiKey=${encodeURIComponent(exaApiKey)}&tools=${EXA_TOOLS}`;
};

type PlaceholderKey = '__EXA_MCP_URL__';

type PlaceholderSpec = {
  prompt: string;
  resolveDefault: () => string;
};

const placeholderSpecs: Record<PlaceholderKey, PlaceholderSpec> = {
  __EXA_MCP_URL__: {
    prompt: 'Exa MCP URL',
    resolveDefault: resolveExaMcpUrl,
  },
};

const promptForValue = async (label: string, fallbackValue: string) => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      `Cannot prompt for ${label} because stdin/stdout is not interactive.`
    );
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question(`${label} [${fallbackValue}]: `);
    return answer.trim() || fallbackValue;
  } finally {
    rl.close();
  }
};

const promptForConfirmation = async (message: string) => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      'Cannot prompt for confirmation because stdin/stdout is not interactive.'
    );
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question(`${message} [y/N]: `);
    return ['y', 'yes'].includes(answer.trim().toLowerCase());
  } finally {
    rl.close();
  }
};

const resolvePlaceholderValues = async (template: string) => {
  const placeholderKeys = Array.from(
    new Set(template.match(placeholderPattern) ?? [])
  );
  const replacements = new Map<string, string>();

  for (const placeholderKey of placeholderKeys) {
    const placeholderSpec = placeholderSpecs[placeholderKey as PlaceholderKey];

    if (!placeholderSpec) {
      throw new Error(
        `No resolver is defined for placeholder ${placeholderKey} in .codex/config.toml.example`
      );
    }

    const defaultValue = placeholderSpec.resolveDefault();
    const finalValue = interactive
      ? await promptForValue(placeholderSpec.prompt, defaultValue)
      : defaultValue;

    replacements.set(placeholderKey, escapeTomlString(finalValue));
  }

  return replacements;
};

const seedCodexConfig = async () => {
  const targetExists = existsSync(targetPath);

  if (!force && targetExists) {
    console.log(
      'Skipping .codex/config.toml because it already exists. Use --force to overwrite it.'
    );
    return;
  }

  if (force && targetExists && !yes) {
    if (!interactive) {
      throw new Error(
        'Refusing to overwrite .codex/config.toml without confirmation. Re-run with --interactive or pass --yes.'
      );
    }

    const confirmed = await promptForConfirmation(
      'Overwrite the existing .codex/config.toml?'
    );

    if (!confirmed) {
      console.log('Aborted without changing .codex/config.toml.');
      return;
    }
  }

  const template = await readFile(templatePath, 'utf8');
  const replacements = await resolvePlaceholderValues(template);
  let config = template;

  for (const [placeholderKey, replacementValue] of replacements.entries()) {
    config = config.replaceAll(placeholderKey, replacementValue);
  }

  await mkdir(codexDir, { recursive: true });

  if (force && targetExists) {
    const currentConfig = await readFile(targetPath, 'utf8');
    await writeFile(backupPath, currentConfig);
  }

  await writeFile(targetPath, config);

  console.log(
    `${force ? 'Updated' : 'Created'} .codex/config.toml from .codex/config.toml.example`
  );

  if (force) {
    console.log(
      `Backed up the previous config to ${path.relative(repoRoot, backupPath)}`
    );
  }

  if (!process.env.EXA_API_KEY?.trim()) {
    console.log(
      'EXA_API_KEY is not set, so Exa MCP was seeded with the anonymous remote URL.'
    );
  }

  if (interactive) {
    console.log('Interactive placeholder prompts were applied.');
  }

  console.log(
    'Supabase MCP tokens are forwarded from shell env vars when available.'
  );
};

await seedCodexConfig();
