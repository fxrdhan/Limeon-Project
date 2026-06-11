import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const formatViolations = (violations: string[]) =>
  violations.length === 0 ? 'none' : violations.sort().join('\n');

const collectFiles = (
  relativeDirectory: string,
  extensions: readonly string[]
) => {
  const rootDirectory = path.join(repoRoot, relativeDirectory);
  const files: string[] = [];

  if (!fs.existsSync(rootDirectory)) {
    return files;
  }

  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        visit(entryPath);
        continue;
      }

      if (!extensions.some(extension => entry.name.endsWith(extension))) {
        continue;
      }

      files.push(path.relative(repoRoot, entryPath).replaceAll(path.sep, '/'));
    }
  };

  visit(rootDirectory);
  return files;
};

describe('project tooling guardrails', () => {
  it('keeps package script entrypoints on VitePlus commands', () => {
    const packageJson = JSON.parse(readText('package.json')) as {
      scripts?: Record<string, string>;
    };
    const scripts = packageJson.scripts ?? {};
    const violations = Object.entries(scripts).flatMap(
      ([scriptName, command]) => {
        if (/\b(?:vite|vitest)\b/.test(command)) {
          return [`${scriptName} runs raw Vite/Vitest command: ${command}`];
        }

        if (/\bbunx\s+(?:--bun\s+)?tsc\b/.test(command)) {
          return [`${scriptName} runs raw tsc command: ${command}`];
        }

        if (/\btsc\b/.test(command) && !command.startsWith('vp exec tsc')) {
          return [`${scriptName} runs tsc outside vp exec: ${command}`];
        }

        return [];
      }
    );

    expect(scripts.typecheck).toBe('vp exec tsc -b --noEmit');
    expect(scripts['typecheck:watch']).toBe(
      'vp exec tsc -b --noEmit --watch --preserveWatchOutput'
    );
    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps CI and strict dev typecheck on the project script', () => {
    const ciWorkflow = readText('.github/workflows/ci.yml');
    const devStrict = readText('scripts/dev-strict.ts');

    expect(ciWorkflow).toContain('run: bun run typecheck');
    expect(ciWorkflow).not.toMatch(/\bbunx\s+(?:--bun\s+)?tsc\b/);
    expect(devStrict).toContain(
      "spawnManagedProcess('typecheck watch', 'vp', ["
    );
    expect(devStrict).toContain("'exec',");
    expect(devStrict).toContain("'tsc',");
  });

  it('keeps user-facing command help on Bun commands', () => {
    const files = [
      'CONTRIBUTING.md',
      'README.md',
      'readme-local.md',
      'src/schemas/README.md',
      ...collectFiles('scripts', ['.ts', '.md']),
    ];
    const bannedCommandPatterns = [
      /\bUsage:\s+yarn\b/,
      /\byarn\s+(?:add-admin|update-password|export)\b/,
      /\bnpm\s+run\b/,
      /\bpnpm\b/,
    ];
    const violations = files.flatMap(filePath => {
      const source = readText(filePath);

      return bannedCommandPatterns.flatMap(pattern =>
        pattern.test(source) ? [`${filePath} contains ${pattern}`] : []
      );
    });

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps tests importing the VitePlus test API', () => {
    const files = [
      ...collectFiles('src', ['.ts', '.tsx']),
      ...collectFiles('supabase/functions', ['.ts', '.tsx']),
    ];
    const violations = files.flatMap(filePath => {
      const source = readText(filePath);

      return /from\s+['"]vitest['"]/.test(source)
        ? [`${filePath} imports vitest directly`]
        : [];
    });

    expect(formatViolations(violations)).toBe('none');
  });
});
