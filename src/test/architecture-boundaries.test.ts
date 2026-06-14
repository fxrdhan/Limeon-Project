/// <reference types="vite-plus/client" />

import ts from 'typescript';
import { describe, expect, it } from 'vite-plus/test';

const sourceModules = import.meta.glob('../**/*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw',
});

const normalizeSegments = (path: string) => {
  const segments: string[] = [];

  for (const segment of path.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      segments.pop();
      continue;
    }

    segments.push(segment);
  }

  return segments.join('/');
};

const normalizeSourcePath = (moduleKey: string) => {
  const normalizedKey = moduleKey.replaceAll('\\', '/');
  const srcIndex = normalizedKey.indexOf('/src/');

  if (srcIndex >= 0) return normalizedKey.slice(srcIndex + 1);
  if (normalizedKey.startsWith('/src/')) return normalizedKey.slice(1);
  if (normalizedKey.startsWith('src/')) return normalizedKey;

  return normalizeSegments(`src/test/${normalizedKey}`);
};

const sourceByPath = new Map(
  Object.entries(sourceModules)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([moduleKey, source]) => [normalizeSourcePath(moduleKey), source])
);
const sourcePaths = new Set(sourceByPath.keys());

const aliasRoots: Record<string, string> = {
  '@': 'src',
  '@assets': 'src/assets',
  '@components': 'src/components',
  '@hooks': 'src/hooks',
  '@lib': 'src/lib',
  '@services': 'src/services',
  '@store': 'src/store',
  '@types': 'src/types',
};

const isRuntimeSource = (filePath: string) =>
  filePath.startsWith('src/') &&
  !filePath.endsWith('.d.ts') &&
  !filePath.includes('/__tests__/') &&
  !filePath.includes('/test/') &&
  !filePath.endsWith('.test.ts') &&
  !filePath.endsWith('.test.tsx') &&
  !filePath.endsWith('.spec.ts') &&
  !filePath.endsWith('.spec.tsx') &&
  !filePath.startsWith('src/schemas/generated/');

const parseSource = (fileName: string, source: string) =>
  ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

const getModuleSpecifiers = (filePath: string, source: string) => {
  const sourceFile = parseSource(filePath, source);
  const moduleSpecifiers: string[] = [];

  sourceFile.forEachChild(node => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      moduleSpecifiers.push(node.moduleSpecifier.text);
    }
  });

  return moduleSpecifiers;
};

const getDynamicImportSpecifiers = (filePath: string, source: string) => {
  const sourceFile = parseSource(filePath, source);
  const moduleSpecifiers: string[] = [];

  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const [specifier] = node.arguments;
      if (specifier && ts.isStringLiteral(specifier)) {
        moduleSpecifiers.push(specifier.text);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return moduleSpecifiers;
};

const resolveKnownPath = (pathWithoutExtension: string) => {
  const candidates = [
    pathWithoutExtension,
    `${pathWithoutExtension}.ts`,
    `${pathWithoutExtension}.tsx`,
    `${pathWithoutExtension}/index.ts`,
    `${pathWithoutExtension}/index.tsx`,
  ];

  return candidates.find(candidate => sourcePaths.has(candidate)) ?? null;
};

const resolveAliasSpecifier = (specifier: string) => {
  for (const [alias, root] of Object.entries(aliasRoots)) {
    if (specifier === alias) return resolveKnownPath(root) ?? root;
    if (specifier.startsWith(`${alias}/`)) {
      const resolvedPath = `${root}/${specifier.slice(alias.length + 1)}`;
      return resolveKnownPath(resolvedPath) ?? resolvedPath;
    }
  }

  return null;
};

const resolveRelativeSpecifier = (fromFile: string, specifier: string) => {
  if (!specifier.startsWith('.')) return null;

  const directory = fromFile.split('/').slice(0, -1).join('/');
  return resolveKnownPath(normalizeSegments(`${directory}/${specifier}`));
};

const resolveImportTarget = (fromFile: string, specifier: string) =>
  resolveAliasSpecifier(specifier) ??
  resolveRelativeSpecifier(fromFile, specifier) ??
  specifier;

const getFeatureName = (filePath: string) => {
  const match = /^src\/features\/([^/]+)\//.exec(filePath);
  return match?.[1] ?? null;
};

const isFeaturePublicApiTarget = (filePath: string) =>
  /^src\/features\/[^/]+\/public\//.test(filePath);

const isDataAccessLayer = (filePath: string) =>
  filePath.startsWith('src/services/') ||
  filePath.startsWith('src/lib/') ||
  /^src\/features\/[^/]+\/infrastructure\//.test(filePath);

const isTestingUtility = (filePath: string) =>
  filePath.startsWith('src/utils/testing/');

const isTestSource = (filePath: string) =>
  filePath.includes('/__tests__/') ||
  filePath.includes('/test/') ||
  filePath.endsWith('.test.ts') ||
  filePath.endsWith('.test.tsx') ||
  filePath.endsWith('.spec.ts') ||
  filePath.endsWith('.spec.tsx');

const isSharedLayerSource = (filePath: string) =>
  filePath.startsWith('src/components/') ||
  filePath.startsWith('src/hooks/') ||
  filePath.startsWith('src/lib/') ||
  filePath.startsWith('src/utils/') ||
  filePath.startsWith('src/store/');

const isAppLayoutSource = (filePath: string) =>
  filePath.startsWith('src/app/layout/');

const isAppRouteSource = (filePath: string) =>
  filePath === 'src/app/App.tsx' || filePath.startsWith('src/app/routes/');

const getRouteMountedFeatureTargets = () =>
  new Set(
    [...sourceByPath.entries()].flatMap(([filePath, source]) => {
      if (!isRuntimeSource(filePath) || !isAppRouteSource(filePath)) return [];

      const routeSpecifiers = [
        ...getModuleSpecifiers(filePath, source),
        ...getDynamicImportSpecifiers(filePath, source),
      ];

      return routeSpecifiers.flatMap(specifier => {
        const target = resolveImportTarget(filePath, specifier);
        return getFeatureName(target) ? [target] : [];
      });
    })
  );

const formatViolations = (violations: string[]) =>
  violations.length === 0 ? 'none' : violations.sort().join('\n');

describe('architecture boundaries', () => {
  it('keeps item-management data owners out of shared hooks', () => {
    const forbiddenSharedPaths = [...sourcePaths].filter(
      filePath =>
        filePath === 'src/hooks/data/useItemsManagement.ts' ||
        filePath === 'src/hooks/data/useMasterDataManagement.ts' ||
        filePath === 'src/hooks/data/searchCore.ts' ||
        filePath.startsWith('src/hooks/data/master-data-management/')
    );
    const forbiddenSpecifiers = new Set([
      '@/hooks/data/useItemsManagement',
      '@/hooks/data/useMasterDataManagement',
      '@/hooks/data/searchCore',
    ]);
    const forbiddenImports = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (!isRuntimeSource(filePath) && !isTestSource(filePath)) return [];

        return getModuleSpecifiers(filePath, source).flatMap(specifier =>
          forbiddenSpecifiers.has(specifier)
            ? [`${filePath} imports deprecated shared data owner ${specifier}`]
            : []
        );
      }
    );

    expect(
      formatViolations([...forbiddenSharedPaths, ...forbiddenImports])
    ).toBe('none');
  });

  it('keeps feature modules from importing other feature modules directly', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (!isRuntimeSource(filePath)) return [];

        const sourceFeature = getFeatureName(filePath);
        if (!sourceFeature) return [];

        return getModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);
          const targetFeature = getFeatureName(target);

          return targetFeature &&
            targetFeature !== sourceFeature &&
            !isFeaturePublicApiTarget(target)
            ? [
                `${filePath} imports ${specifier} (${targetFeature}) from ${sourceFeature}`,
              ]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps Supabase clients behind data access layers', () => {
    const supabaseClientSpecifiers = new Set([
      '@/lib/authSupabase',
      '@/lib/supabase',
      '@lib/authSupabase',
      '@lib/supabase',
    ]);
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (!isRuntimeSource(filePath) || isDataAccessLayer(filePath)) {
          return [];
        }

        return getModuleSpecifiers(filePath, source).flatMap(specifier =>
          supabaseClientSpecifiers.has(specifier)
            ? [`${filePath} imports ${specifier}`]
            : []
        );
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps service and lib runtime modules independent from stores', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (
          !isRuntimeSource(filePath) ||
          (!filePath.startsWith('src/services/') &&
            !filePath.startsWith('src/lib/'))
        ) {
          return [];
        }

        return getModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return target.startsWith('src/store/')
            ? [`${filePath} imports store module ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps shared runtime modules from depending on features by default', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (
          !isRuntimeSource(filePath) ||
          !isSharedLayerSource(filePath) ||
          isTestingUtility(filePath)
        ) {
          return [];
        }

        return getModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return getFeatureName(target)
            ? [`${filePath} imports feature module ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps app layout integration on feature public APIs', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (!isRuntimeSource(filePath) || !isAppLayoutSource(filePath)) {
          return [];
        }

        return getModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return getFeatureName(target) && !isFeaturePublicApiTarget(target)
            ? [`${filePath} imports feature internal ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps testing utility feature access on public APIs', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (!isRuntimeSource(filePath) || !isTestingUtility(filePath)) {
          return [];
        }

        return getModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return getFeatureName(target) && !isFeaturePublicApiTarget(target)
            ? [`${filePath} imports feature internal ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps runtime React Query keys out of ad-hoc string literals', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (!isRuntimeSource(filePath)) return [];

        const sourceFile = parseSource(filePath, source);
        const fileViolations: string[] = [];

        const visit = (node: ts.Node) => {
          if (
            ts.isPropertyAssignment(node) &&
            ts.isIdentifier(node.name) &&
            node.name.text === 'queryKey' &&
            ts.isArrayLiteralExpression(node.initializer)
          ) {
            const firstElement = node.initializer.elements[0];
            if (firstElement && ts.isStringLiteral(firstElement)) {
              const { line, character } =
                sourceFile.getLineAndCharacterOfPosition(
                  node.initializer.getStart(sourceFile)
                );
              fileViolations.push(
                `${filePath}:${line + 1}:${character + 1} uses queryKey string literal "${firstElement.text}"`
              );
            }
          }

          ts.forEachChild(node, visit);
        };

        visit(sourceFile);
        return fileViolations;
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps route-mounted feature screens free of direct React Query orchestration', () => {
    const violations = [...getRouteMountedFeatureTargets()].flatMap(
      filePath => {
        const source = sourceByPath.get(filePath);

        if (!source) return [`${filePath} is missing`];

        return getModuleSpecifiers(filePath, source).flatMap(specifier =>
          specifier === '@tanstack/react-query'
            ? [`${filePath} imports ${specifier}`]
            : []
        );
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps route-mounted feature screens from importing data services directly', () => {
    const violations = [...getRouteMountedFeatureTargets()].flatMap(
      filePath => {
        const source = sourceByPath.get(filePath);

        if (!source) return [`${filePath} is missing`];

        return getModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return target.startsWith('src/services/')
            ? [`${filePath} imports data service ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps test API imports on the VitePlus test entrypoint', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (!isTestSource(filePath)) return [];

        return getModuleSpecifiers(filePath, source).flatMap(specifier =>
          specifier === 'vitest' ? [`${filePath} imports vitest directly`] : []
        );
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });
});
