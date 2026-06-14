/// <reference types="node" />

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
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

const collectDirectories = (relativeDirectory: string) => {
  const rootDirectory = path.join(repoRoot, relativeDirectory);

  if (!fs.existsSync(rootDirectory)) {
    return [];
  }

  return fs
    .readdirSync(rootDirectory, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => `${relativeDirectory}/${entry.name}`);
};

const existingFiles = (files: readonly string[]) =>
  files.filter(filePath => fs.existsSync(path.join(repoRoot, filePath)));

const getPackageNameFromSpecifier = (specifier: string) => {
  if (
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    specifier.startsWith('@/') ||
    specifier.startsWith('@assets') ||
    specifier.startsWith('@components') ||
    specifier.startsWith('@hooks') ||
    specifier.startsWith('@lib') ||
    specifier.startsWith('@services') ||
    specifier.startsWith('@store') ||
    specifier.startsWith('@types')
  ) {
    return null;
  }

  if (specifier.startsWith('@')) {
    return specifier.split('/').slice(0, 2).join('/');
  }

  return specifier.split('/')[0];
};

const getScriptKind = (filePath: string) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
    return ts.ScriptKind.TSX;
  }
  if (
    filePath.endsWith('.js') ||
    filePath.endsWith('.mjs') ||
    filePath.endsWith('.cjs')
  ) {
    return ts.ScriptKind.JS;
  }

  return ts.ScriptKind.TS;
};

const getImportedPackages = (filePath: string) => {
  const source = readText(filePath);
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(filePath)
  );
  const packageNames = new Set<string>();

  const addSpecifier = (specifier: string) => {
    const packageName = getPackageNameFromSpecifier(specifier);
    if (packageName) {
      packageNames.add(packageName);
    }
  };

  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      addSpecifier(node.moduleSpecifier.text);
    }

    if (ts.isCallExpression(node)) {
      const isDynamicImport =
        node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire =
        ts.isIdentifier(node.expression) && node.expression.text === 'require';

      if (isDynamicImport || isRequire) {
        const [specifier] = node.arguments;
        if (specifier && ts.isStringLiteral(specifier)) {
          addSpecifier(specifier.text);
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return packageNames;
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
    expect(scripts['test:coverage:open']).toBe(
      'vp test run --coverage && open coverage/index.html'
    );
    expect(scripts['gen:schemas']).toBe(
      'bun run gen:schemas:db && bun run gen:schemas:forms && bun run gen:schemas:invoice && bun run gen:schemas:purchase'
    );
    expect(scripts['test:agent:run']).toBe(
      'AI_AGENT=codex vp test run --passWithNoTests'
    );
    expect(scripts['test:run:agent']).toBe(
      'AI_AGENT=codex vp test run --passWithNoTests'
    );
    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps the deprecated Chart.js stack out of package and build config', () => {
    const packageJson = JSON.parse(readText('package.json')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    const viteConfig = readText('vite.config.ts');
    const removedChartPackages = ['chart.js', 'react-chartjs-2'];
    const violations = [
      ...removedChartPackages.flatMap(packageName =>
        packageName in dependencies
          ? [`package.json still depends on ${packageName}`]
          : []
      ),
      ...removedChartPackages.flatMap(packageName =>
        viteConfig.includes(packageName)
          ? [`vite.config.ts still references ${packageName}`]
          : []
      ),
    ];

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps runtime package dependencies backed by source imports', () => {
    const packageJson = JSON.parse(readText('package.json')) as {
      dependencies?: Record<string, string>;
    };
    const sourceFiles = [
      ...collectFiles('src', ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']),
      ...collectFiles('scripts', [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.mjs',
        '.cjs',
      ]),
      ...collectFiles('supabase/functions', [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.mjs',
        '.cjs',
      ]),
      ...[
        'vite.config.ts',
        'playwright.config.ts',
        'tailwind.config.ts',
        'postcss.config.js',
        'ts-to-zod.config.mjs',
      ].filter(filePath => fs.existsSync(path.join(repoRoot, filePath))),
    ];
    const importedPackages = new Set(
      sourceFiles.flatMap(filePath => [...getImportedPackages(filePath)])
    );
    const violations = Object.keys(packageJson.dependencies ?? {}).flatMap(
      packageName =>
        importedPackages.has(packageName)
          ? []
          : [`package.json dependency ${packageName} has no source import`]
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps package script source path arguments resolvable', () => {
    const packageJson = JSON.parse(readText('package.json')) as {
      scripts?: Record<string, string>;
    };
    const sourcePathPattern =
      /(?:^|\s)((?:src|scripts|supabase|tests|docs)\/[^\s"'&|;]+)/g;
    const violations = Object.entries(packageJson.scripts ?? {}).flatMap(
      ([scriptName, command]) =>
        [...command.matchAll(sourcePathPattern)].flatMap(match => {
          const token = match[1];

          if (/[*?[\]{}]/.test(token)) {
            return [];
          }

          return fs.existsSync(path.join(repoRoot, token))
            ? []
            : [`${scriptName} references missing path ${token}`];
        })
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps TypeScript and Vite aliases in sync', () => {
    const tsConfig = JSON.parse(readText('tsconfig.app.json')) as {
      compilerOptions?: {
        paths?: Record<string, string[]>;
      };
    };
    const viteConfig = readText('vite.config.ts');
    const tsAliases = new Map(
      Object.entries(tsConfig.compilerOptions?.paths ?? {}).map(
        ([alias, targets]) => [
          alias.replace(/\/\*$/, ''),
          targets[0]?.replace(/^\.\//, '').replace(/\/\*$/, '') ?? '',
        ]
      )
    );
    const viteAliases = new Map<string, string>();
    const viteAliasPattern =
      /^\s*['"]([^'"]+)['"]:\s*path\.resolve\(__dirname,\s*['"]\.\/([^'"]+)['"]\)/gm;

    for (const match of viteConfig.matchAll(viteAliasPattern)) {
      viteAliases.set(match[1], match[2]);
    }

    const aliasNames = new Set([...tsAliases.keys(), ...viteAliases.keys()]);
    const violations = [...aliasNames].flatMap(alias => {
      const tsTarget = tsAliases.get(alias);
      const viteTarget = viteAliases.get(alias);

      if (!tsTarget) return [`vite.config.ts alias ${alias} is missing in TS`];
      if (!viteTarget)
        return [`tsconfig.app.json alias ${alias} is missing in Vite`];
      if (tsTarget !== viteTarget) {
        return [
          `alias ${alias} points to ${tsTarget} in TS but ${viteTarget} in Vite`,
        ];
      }
      if (!fs.existsSync(path.join(repoRoot, tsTarget))) {
        return [`alias ${alias} points to missing directory ${tsTarget}`];
      }

      return [];
    });

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps pre-commit hooks aligned with lint-staged parity', () => {
    const lintStaged = JSON.parse(readText('.lintstagedrc.json')) as Record<
      string,
      string[]
    >;
    const preCommitHook = readText('.husky/pre-commit');
    const commitMessageHook = readText('.husky/commit-msg');
    const tsCommands = lintStaged['*.{ts,tsx,js,jsx}'] ?? [];
    const proseCommands = lintStaged['*.{json,md,yml,yaml}'] ?? [];
    const violations = [
      tsCommands[0] !==
      'node_modules/.bin/oxlint --fix --deny-warnings --no-error-on-unmatched-pattern'
        ? 'lint-staged TS command must use local oxlint with deny-warnings'
        : '',
      tsCommands[1] !== 'vp fmt --write --no-error-on-unmatched-pattern'
        ? 'lint-staged TS command must format through VitePlus'
        : '',
      proseCommands[0] !== 'vp fmt --write'
        ? 'lint-staged prose/config command must format through VitePlus'
        : '',
      !preCommitHook.includes('bun run check:chat-schema:fix')
        ? 'pre-commit hook must refresh chat schema when migrations are staged'
        : '',
      !preCommitHook.includes('git add src/types/supabase-chat.generated.ts')
        ? 'pre-commit hook must restage generated chat schema types'
        : '',
      !preCommitHook.includes('bunx lint-staged')
        ? 'pre-commit hook must run lint-staged through Bun'
        : '',
      preCommitHook.includes('echo "\\n')
        ? 'pre-commit hook must use printf for portable newlines'
        : '',
      !preCommitHook.includes("printf '\\n")
        ? 'pre-commit hook must print final status with printf'
        : '',
      commitMessageHook.trim() !== 'bunx --bun commitlint --edit "$1"'
        ? 'commit-msg hook must run commitlint through Bun with quoted edit path'
        : '',
    ].filter(Boolean);

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps CI and strict dev workflows on direct VitePlus commands', () => {
    const ciWorkflow = readText('.github/workflows/ci.yml');
    const codeqlWorkflow = readText('.github/workflows/codeql.yml');
    const devStrict = readText('scripts/dev-strict.ts');

    expect(ciWorkflow).toContain('run: vp exec tsc -b --noEmit');
    expect(ciWorkflow).toContain('run: vp lint . --deny-warnings');
    expect(ciWorkflow).toContain('run: vp fmt . --check');
    expect(ciWorkflow).toContain('run: vp test run --coverage');
    expect(ciWorkflow).toContain('run: vp build');
    expect(ciWorkflow).toContain("- '.github/pull_request_template.md'");
    expect(ciWorkflow).not.toContain('.github/PULL_REQUEST_TEMPLATE.md');
    for (const configPath of ['tailwind.config.*', 'postcss.config.*']) {
      expect(ciWorkflow).toContain(`- '${configPath}'`);
      expect(codeqlWorkflow).toContain(`- '${configPath}'`);
    }
    for (const configPath of ['playwright.config.*', 'ts-to-zod.config.*']) {
      expect(ciWorkflow).toContain(`- '${configPath}'`);
    }
    for (const configPath of [
      '.codex/**',
      '.credential.example',
      '.ignore',
      'opencode.json.example',
      'skills-lock.json',
    ]) {
      expect(ciWorkflow).toContain(`- '${configPath}'`);
    }
    for (const stalePath of ['vitest.config.*', '.swcrc']) {
      expect(ciWorkflow).not.toContain(stalePath);
      expect(codeqlWorkflow).not.toContain(stalePath);
    }
    expect(ciWorkflow).not.toMatch(
      /\bbun run (?:typecheck|lint|format:check|test:coverage|build)\b/
    );
    expect(ciWorkflow).not.toMatch(/\bbunx\s+(?:--bun\s+)?tsc\b/);
    const installSteps =
      ciWorkflow.match(/run: bun install --frozen-lockfile/g)?.length ?? 0;
    const localBinPathSteps =
      ciWorkflow.match(
        /run: echo "\$PWD\/node_modules\/\.bin" >> "\$GITHUB_PATH"/g
      )?.length ?? 0;
    expect(localBinPathSteps).toBe(installSteps);
    expect(devStrict).toContain(
      "spawnManagedProcess('typecheck watch', 'vp', ["
    );
    expect(devStrict).toContain("'exec',");
    expect(devStrict).toContain("'tsc',");
  });

  it('keeps user-facing command help on Bun commands', () => {
    const files = existingFiles([
      'CONTRIBUTING.md',
      'README.md',
      'SECURITY.md',
      'readme-local.md',
      'src/schemas/README.md',
      ...collectFiles('scripts', ['.ts', '.md']),
    ]);
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

  it('keeps user-facing workflow docs on direct VitePlus commands', () => {
    const files = existingFiles([
      '.github/pull_request_template.md',
      'CONTRIBUTING.md',
      'README.md',
      'readme-local.md',
      'scripts/check-coverage-100.ts',
      'scripts/coverage/generate-non-runtime-files.ts',
    ]);
    const bannedPatterns = [
      /\bbun run (?:dev|build|preview|lint|format|check|test)(?::|\b)/,
      /\bVite\b/,
      /\bVitest\b/,
      /\bvite\b/,
      /\bvitest\b/,
    ];
    const violations = files.flatMap(filePath => {
      const source = readText(filePath);

      return bannedPatterns.flatMap(pattern =>
        pattern.test(source) ? [`${filePath} contains ${pattern}`] : []
      );
    });

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps the PR template aligned with canonical checks and boundaries', () => {
    const source = readText('.github/pull_request_template.md');
    const requiredSnippets = [
      '`vp check`',
      '`vp test run --passWithNoTests`',
      '`vp build`',
      'Cross-feature imports use explicit feature public APIs or route/page entries',
      'App route/layout code does not import service/data clients directly',
      'Direct Supabase client access stays inside service or feature data boundaries',
      'Feature-owned UI state stays inside the owning feature',
      'React Query keys use `src/constants/queryKeys.ts`',
    ];
    const violations = requiredSnippets.flatMap(snippet =>
      source.includes(snippet)
        ? []
        : [`.github/pull_request_template.md is missing ${snippet}`]
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps schema documentation free of missing legacy test paths', () => {
    const source = readText('src/schemas/README.md');

    expect(source).not.toContain(
      'src/schemas/__tests__/generated-schemas.test.ts'
    );
    expect(source).not.toContain('__tests__/generated-schemas.test.ts');
    expect(source).not.toContain('generated-schemas.test.ts');
    expect(source).toContain('vp test run --passWithNoTests');
  });

  it('keeps feature README source path references resolvable', () => {
    const readmeFiles = collectFiles('src/features', ['README.md']).filter(
      filePath => path.basename(filePath) === 'README.md'
    );
    const sourceRootPattern = /^(src|supabase|scripts|tests|docs|shared)\//;
    const featureRelativePattern =
      /^(public|data|store|hooks|utils|components|application|domain|infrastructure|presentation|pages|config|login)\//;
    const sourceFilePattern = /^[\w.-]+\.(ts|tsx|md|sql)$/;

    const pathExists = (readmeFilePath: string, token: string) => {
      if (sourceRootPattern.test(token)) {
        return fs.existsSync(path.join(repoRoot, token));
      }

      if (featureRelativePattern.test(token) || sourceFilePattern.test(token)) {
        const featureRoot = readmeFilePath.split('/').slice(0, 3).join('/');
        return fs.existsSync(path.join(repoRoot, featureRoot, token));
      }

      return true;
    };
    const violations = readmeFiles.flatMap(filePath => {
      const source = readText(filePath);

      return [...source.matchAll(/`([^`]+)`/g)].flatMap(match => {
        const token = match[1];

        if (
          !/[/.]/.test(token) ||
          token.includes('*') ||
          token.includes('...') ||
          token.includes(' ') ||
          /^(bun|CHAT_|public\.|localStorage|IndexedDB)/.test(token)
        ) {
          return [];
        }

        return pathExists(filePath, token)
          ? []
          : [`${filePath} references missing source path ${token}`];
      });
    });

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps runtime feature directories documented with ownership maps', () => {
    const featureDirectories = collectDirectories('src/features');
    const violations = featureDirectories.flatMap(directory => {
      const readmePath = path.join(repoRoot, directory, 'README.md');

      return fs.existsSync(readmePath)
        ? []
        : [`${directory} is missing README.md ownership map`];
    });

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps non-runtime coverage entries resolvable', () => {
    const nonRuntimeFiles = JSON.parse(
      readText('scripts/coverage/non-runtime-files.json')
    ) as string[];
    const violations = nonRuntimeFiles.flatMap(filePath =>
      fs.existsSync(path.join(repoRoot, filePath))
        ? []
        : [
            `scripts/coverage/non-runtime-files.json references missing ${filePath}`,
          ]
    );

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

  it('keeps Supabase migration filenames valid and uniquely named', () => {
    const migrationFiles = collectFiles('supabase/migrations', ['.sql']);
    const seenMigrationNames = new Map<string, string>();
    const violations = migrationFiles.flatMap(filePath => {
      const fileName = path.basename(filePath);
      const match = /^(\d{14})_([a-z0-9_]+)\.sql$/.exec(fileName);

      if (!match) {
        return [`${filePath} does not use <14-digit-version>_<name>.sql`];
      }

      const migrationName = match[2];
      const previousFilePath = seenMigrationNames.get(migrationName);
      seenMigrationNames.set(migrationName, filePath);

      return previousFilePath
        ? [
            `${filePath} duplicates migration name ${migrationName} from ${previousFilePath}`,
          ]
        : [];
    });

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps Supabase Edge Function directories deployable from local source', () => {
    const functionDirectories = collectDirectories('supabase/functions').filter(
      directory => path.basename(directory) !== '_shared'
    );
    const violations = functionDirectories.flatMap(directory => {
      const entrypointPath = path.join(repoRoot, directory, 'index.ts');

      return fs.existsSync(entrypointPath)
        ? []
        : [`${directory} is missing index.ts`];
    });

    expect(formatViolations(violations)).toBe('none');
  });
});
