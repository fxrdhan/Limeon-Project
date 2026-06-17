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

const getAllModuleSpecifiers = (filePath: string, source: string) => [
  ...getModuleSpecifiers(filePath, source),
  ...getDynamicImportSpecifiers(filePath, source),
];

const getPropertyAccessRootIdentifier = (node: ts.Node): string | null => {
  let currentNode = node;

  while (ts.isPropertyAccessExpression(currentNode)) {
    currentNode = currentNode.expression;
  }

  return ts.isIdentifier(currentNode) ? currentNode.text : null;
};

const getPropertyAccessSegments = (node: ts.Node): string[] | null => {
  if (ts.isIdentifier(node)) return [node.text];
  if (!ts.isPropertyAccessExpression(node)) return null;

  const parentSegments = getPropertyAccessSegments(node.expression);
  return parentSegments ? [...parentSegments, node.name.text] : null;
};

const isGetInvalidationKeysCall = (node: ts.Node) =>
  ts.isCallExpression(node) &&
  getPropertyAccessRootIdentifier(node.expression) === 'getInvalidationKeys';

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

const isFeatureTestingPublicApiTarget = (filePath: string) =>
  /^src\/features\/[^/]+\/public\/testing\.(ts|tsx)$/.test(filePath);

const isFeatureRouteEntryTarget = (filePath: string) =>
  /^src\/features\/[^/]+\/index\.(ts|tsx)$/.test(filePath) ||
  /^src\/features\/[^/]+\/[^/]+\/index\.(ts|tsx)$/.test(filePath) ||
  /^src\/features\/[^/]+\/pages\/[^/]+\/index\.(ts|tsx)$/.test(filePath) ||
  /^src\/features\/[^/]+\/pages\/[^/]+Page\.tsx$/.test(filePath) ||
  /^src\/features\/[^/]+\/.+Page\.tsx$/.test(filePath);

const supabaseClientBoundarySources = new Set([
  'src/lib/authSupabase.ts',
  'src/lib/browserLogoutCleanup.ts',
  'src/lib/supabaseRealtimeAuth.ts',
]);

const isDataAccessLayer = (filePath: string) =>
  filePath.startsWith('src/services/') ||
  supabaseClientBoundarySources.has(filePath) ||
  /^src\/features\/[^/]+\/infrastructure\//.test(filePath);

const storeDataAccessHelperSources = new Set([
  'src/store/authStoreProfilePhotoServices.ts',
  'src/store/authStoreServices.ts',
  'src/store/presenceDirectoryStoreServices.ts',
]);

const sharedHookStoreBridgeSources = new Set([
  'src/hooks/presence/usePresence.ts',
  'src/hooks/presence/usePresenceLifecycle.ts',
  'src/hooks/presence/usePresenceRoster.ts',
  'src/hooks/presence/usePresenceRosterSync.ts',
  'src/hooks/useDirectoryRoster.ts',
]);

const uiRuntimeSpecifiers = new Set([
  '@tanstack/react-query',
  'framer-motion',
  'lucide-react',
  'react',
  'react-dom',
  'react-hot-toast',
]);

const isUiRuntimeSpecifier = (specifier: string) =>
  uiRuntimeSpecifiers.has(specifier) ||
  specifier.startsWith('react/') ||
  specifier.startsWith('react-dom/');

const isUiOrApplicationLayerTarget = (target: string) =>
  target.startsWith('src/app/') ||
  target.startsWith('src/components/') ||
  target.startsWith('src/hooks/') ||
  target.startsWith('src/store/') ||
  /^src\/features\/[^/]+\/(application|components|hooks|pages|presentation)\//.test(
    target
  );

const isModuleTarget = (target: string, modulePath: string) =>
  target === modulePath ||
  target === `${modulePath}.ts` ||
  target === `${modulePath}.tsx`;

const isSupabaseClientTarget = (target: string) =>
  isModuleTarget(target, 'src/lib/authSupabase') ||
  isModuleTarget(target, 'src/lib/supabase');

const isStoreSideEffectTarget = (target: string) =>
  isSupabaseClientTarget(target) ||
  isModuleTarget(target, 'src/lib/browserLogoutCleanup') ||
  isModuleTarget(target, 'src/lib/supabaseRealtimeAuth');

const isFeatureDataAccessBoundary = (filePath: string) =>
  /^src\/features\/[^/]+\/data\//.test(filePath) ||
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

const isSharedUiOrUtilitySource = (filePath: string) =>
  filePath.startsWith('src/components/') || filePath.startsWith('src/utils/');

const isAppLayoutSource = (filePath: string) =>
  filePath.startsWith('src/app/layout/');

const isAppRouteSource = (filePath: string) =>
  filePath === 'src/app/App.tsx' || filePath.startsWith('src/app/routes/');

const getRouteMountedFeatureTargets = () =>
  new Set(
    [...sourceByPath.entries()].flatMap(([filePath, source]) => {
      if (!isRuntimeSource(filePath) || !isAppRouteSource(filePath)) return [];

      const routeSpecifiers = getAllModuleSpecifiers(filePath, source);

      return routeSpecifiers.flatMap(specifier => {
        const target = resolveImportTarget(filePath, specifier);
        return getFeatureName(target) ? [target] : [];
      });
    })
  );

const formatViolations = (violations: string[]) =>
  violations.length === 0 ? 'none' : violations.sort().join('\n');

const browserDialogCalls = new Set([
  'alert',
  'confirm',
  'globalThis.alert',
  'globalThis.confirm',
  'globalThis.prompt',
  'prompt',
  'window.alert',
  'window.confirm',
  'window.prompt',
]);

type TypeAssertionDetails = {
  expressionIdentifier: string | null;
  location: string;
  text: string;
  typeIdentifiers: string[];
};

const unwrapExpression = (expression: ts.Expression): ts.Expression => {
  let currentExpression = expression;

  while (ts.isParenthesizedExpression(currentExpression)) {
    currentExpression = currentExpression.expression;
  }

  return currentExpression;
};

const getExpressionIdentifier = (expression: ts.Expression) => {
  const unwrappedExpression = unwrapExpression(expression);

  return ts.isIdentifier(unwrappedExpression) ? unwrappedExpression.text : null;
};

const getTypeIdentifiers = (typeNode: ts.TypeNode) => {
  const identifiers = new Set<string>();

  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node)) {
      identifiers.add(node.text);
    }

    ts.forEachChild(node, visit);
  };

  visit(typeNode);
  return [...identifiers];
};

const getTypeAssertions = (filePath: string, source: string) => {
  const sourceFile = parseSource(filePath, source);
  const assertions: TypeAssertionDetails[] = [];

  const recordAssertion = (node: ts.AsExpression | ts.TypeAssertion) => {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(
      node.getStart(sourceFile)
    );

    assertions.push({
      expressionIdentifier: getExpressionIdentifier(node.expression),
      location: `${filePath}:${line + 1}:${character + 1}`,
      text: node.getText(sourceFile),
      typeIdentifiers: getTypeIdentifiers(node.type),
    });
  };

  const visit = (node: ts.Node) => {
    if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
      recordAssertion(node);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return assertions;
};

const isMatureUiComponentSource = (filePath: string) =>
  filePath.startsWith('src/components/calendar/') ||
  filePath.startsWith('src/components/combobox/') ||
  filePath.startsWith('src/components/search-bar/');

const getBrowserDialogViolations = (filePath: string, source: string) => {
  const sourceFile = parseSource(filePath, source);
  const fileViolations: string[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const callPath = getPropertyAccessSegments(node.expression)?.join('.');

      if (callPath && browserDialogCalls.has(callPath)) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(
          node.expression.getStart(sourceFile)
        );
        fileViolations.push(
          `${filePath}:${line + 1}:${character + 1} uses browser dialog ${callPath}`
        );
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return fileViolations;
};

describe('architecture boundaries', () => {
  it('keeps item-management data owners out of shared hooks', () => {
    const requiredSources = [
      'src/features/item-management/public/useItemData.ts',
      'src/features/item-management/public/useReferenceData.ts',
      'src/features/item-management/application/hooks/instances/useEntityModalRealtime.ts',
      'src/features/item-management/application/hooks/instances/useSmartFormSync.ts',
      'src/features/item-management/application/hooks/data/useItemsSync.ts',
      'src/features/item-management/application/hooks/data/useSuppliersSync.ts',
    ];
    const forbiddenSharedPaths = [...sourcePaths].filter(
      filePath =>
        filePath === 'src/hooks/data/useItemsManagement.ts' ||
        filePath === 'src/hooks/data/useMasterDataManagement.ts' ||
        filePath === 'src/hooks/data/searchCore.ts' ||
        filePath === 'src/hooks/items/useItemSelection.ts' ||
        filePath === 'src/hooks/realtime/useEntityModalRealtime.ts' ||
        filePath === 'src/hooks/realtime/useItemsSync.ts' ||
        filePath === 'src/hooks/realtime/useSmartFormSync.ts' ||
        filePath === 'src/hooks/realtime/useSuppliersSync.ts' ||
        filePath.startsWith('src/hooks/data/master-data-management/')
    );
    const forbiddenSpecifiers = new Set([
      '@/hooks/data/useItemsManagement',
      '@/hooks/data/useMasterDataManagement',
      '@/hooks/data/searchCore',
      '@/hooks/items/useItemSelection',
    ]);
    const forbiddenImports = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (!isRuntimeSource(filePath) && !isTestSource(filePath)) return [];

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier =>
          forbiddenSpecifiers.has(specifier)
            ? [`${filePath} imports deprecated shared data owner ${specifier}`]
            : []
        );
      }
    );
    const itemDataConsumerRoots = [
      'src/features/item-management/application/hooks/data/',
      'src/features/item-management/application/hooks/instances/',
      'src/features/item-management/pages/item-master/',
    ];
    const forbiddenItemDataImports = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (
          !isRuntimeSource(filePath) ||
          !itemDataConsumerRoots.some(root => filePath.startsWith(root)) ||
          filePath.startsWith('src/features/item-management/public/')
        ) {
          return [];
        }

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier =>
          specifier === '@/hooks/queries' ||
          specifier === '@/hooks/queries/useItems' ||
          specifier === '@/hooks/realtime/useItemsSync'
            ? [
                `${filePath} imports item data outside item-management public API`,
              ]
            : []
        );
      }
    );
    const referenceDataConsumerRoots = [
      'src/features/item-management/application/hooks/core/',
    ];
    const forbiddenReferenceDataImports = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (
          !isRuntimeSource(filePath) ||
          !referenceDataConsumerRoots.some(root => filePath.startsWith(root))
        ) {
          return [];
        }

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier =>
          specifier === '@/hooks/queries/useMasterData' ||
          specifier === '@/hooks/queries/useDosages' ||
          specifier === '@/hooks/queries/useManufacturers'
            ? [
                `${filePath} imports item reference data outside item-management public API`,
              ]
            : []
        );
      }
    );

    expect(
      formatViolations([
        ...requiredSources.flatMap(filePath =>
          sourcePaths.has(filePath)
            ? []
            : [`item-management public item data API is missing ${filePath}`]
        ),
        ...forbiddenSharedPaths,
        ...forbiddenImports,
        ...forbiddenItemDataImports,
        ...forbiddenReferenceDataImports,
      ])
    ).toBe('none');
  });

  it('keeps item-management application hooks on explicit module imports', () => {
    const forbiddenHookBarrels = [...sourcePaths].filter(filePath =>
      /^src\/features\/item-management\/application\/hooks\/[^/]+\/index\.ts$/.test(
        filePath
      )
    );

    expect(formatViolations(forbiddenHookBarrels)).toBe('none');
  });

  it('keeps feature modules from importing other feature modules directly', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (!isRuntimeSource(filePath)) return [];

        const sourceFeature = getFeatureName(filePath);
        if (!sourceFeature) return [];

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
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

  it('keeps feature public APIs free of direct data access imports', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (!isRuntimeSource(filePath) || !isFeaturePublicApiTarget(filePath)) {
          return [];
        }

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return target.startsWith('src/services/') ||
            isSupabaseClientTarget(target)
            ? [`${filePath} imports data access module ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps feature testing public APIs out of runtime imports', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (
          (!isRuntimeSource(filePath) && !isTestSource(filePath)) ||
          isTestSource(filePath) ||
          isTestingUtility(filePath)
        ) {
          return [];
        }

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return isFeatureTestingPublicApiTarget(target)
            ? [`${filePath} imports testing public API ${specifier}`]
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

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier =>
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

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return target.startsWith('src/store/')
            ? [`${filePath} imports store module ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps service modules free of UI and feature dependencies', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (
          !isRuntimeSource(filePath) ||
          !filePath.startsWith('src/services/')
        ) {
          return [];
        }

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return isUiRuntimeSpecifier(specifier) ||
            isUiOrApplicationLayerTarget(target) ||
            getFeatureName(target)
            ? [`${filePath} imports UI/feature dependency ${specifier}`]
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

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return getFeatureName(target)
            ? [`${filePath} imports feature module ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps shared UI and utility modules free of data access imports', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (
          !isRuntimeSource(filePath) ||
          !isSharedUiOrUtilitySource(filePath) ||
          isTestingUtility(filePath)
        ) {
          return [];
        }

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return target.startsWith('src/services/') ||
            isStoreSideEffectTarget(target)
            ? [`${filePath} imports data access module ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps shared UI and utility modules independent from app state', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (
          !isRuntimeSource(filePath) ||
          !isSharedUiOrUtilitySource(filePath) ||
          isTestingUtility(filePath)
        ) {
          return [];
        }

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return target.startsWith('src/app/') ||
            target.startsWith('src/store/')
            ? [`${filePath} imports app state module ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps runtime feedback on app-managed dialogs', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (!isRuntimeSource(filePath) || isMatureUiComponentSource(filePath)) {
          return [];
        }

        return getBrowserDialogViolations(filePath, source);
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps shared hook data access inside query and sync hooks', () => {
    const allowedSharedHookDataRoots = [
      'src/hooks/queries/',
      'src/hooks/realtime/',
      'src/hooks/presence/usePresenceLifecycle.ts',
      'src/hooks/presence/usePresenceRosterSync.ts',
    ];
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (
          !isRuntimeSource(filePath) ||
          !filePath.startsWith('src/hooks/') ||
          allowedSharedHookDataRoots.some(root => filePath.startsWith(root))
        ) {
          return [];
        }

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return target.startsWith('src/services/') ||
            isSupabaseClientTarget(target)
            ? [`${filePath} imports data access module ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps shared hook store imports inside presence and directory bridges', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (
          !isRuntimeSource(filePath) ||
          !filePath.startsWith('src/hooks/') ||
          sharedHookStoreBridgeSources.has(filePath)
        ) {
          return [];
        }

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return target.startsWith('src/store/')
            ? [`${filePath} imports store module ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps store data access imports inside store service helpers', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (
          !isRuntimeSource(filePath) ||
          !filePath.startsWith('src/store/') ||
          storeDataAccessHelperSources.has(filePath)
        ) {
          return [];
        }

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return target.startsWith('src/services/') ||
            isStoreSideEffectTarget(target)
            ? [`${filePath} imports data access module ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps settings profile workflow on layered feature ownership', () => {
    const requiredSources = [
      'src/features/settings/pages/profile/ProfilePage.tsx',
      'src/features/settings/application/profile/useProfilePage.ts',
      'src/features/settings/domain/profileEditValues.ts',
      'src/features/settings/infrastructure/companyProfileData.ts',
    ];
    const forbiddenLegacySources = [...sourcePaths].filter(filePath =>
      filePath.startsWith('src/features/settings/profile/')
    );
    const violations = [
      ...requiredSources.flatMap(filePath =>
        sourcePaths.has(filePath)
          ? []
          : [`settings profile layer is missing ${filePath}`]
      ),
      ...forbiddenLegacySources.map(
        filePath => `${filePath} uses legacy unlayered settings profile path`
      ),
    ];

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps dashboard workflow on layered feature ownership', () => {
    const requiredSources = [
      'src/features/dashboard/pages/index.tsx',
      'src/features/dashboard/application/useDashboardData.ts',
      'src/features/dashboard/application/useDashboardRealtime.ts',
      'src/features/dashboard/domain/dashboardDisplay.ts',
      'src/features/dashboard/domain/types.ts',
      'src/features/dashboard/infrastructure/dashboardData.ts',
      'src/features/dashboard/infrastructure/dashboardRealtime.ts',
    ];
    const forbiddenLegacySources = [...sourcePaths].filter(
      filePath =>
        filePath === 'src/features/dashboard/index.tsx' ||
        filePath === 'src/features/dashboard/constants.ts' ||
        filePath === 'src/features/dashboard/types.ts' ||
        filePath === 'src/hooks/queries/useDashboard.ts' ||
        filePath === 'src/hooks/realtime/useDashboardRealtime.ts'
    );
    const violations = [
      ...requiredSources.flatMap(filePath =>
        sourcePaths.has(filePath)
          ? []
          : [`dashboard layer is missing ${filePath}`]
      ),
      ...forbiddenLegacySources.map(
        filePath => `${filePath} uses legacy dashboard ownership path`
      ),
    ];

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps sales workflows on layered feature ownership', () => {
    const requiredSources = [
      'src/features/sales/pages/list/index.tsx',
      'src/features/sales/pages/create-sale/index.tsx',
      'src/features/sales/application/list/useSalesListPage.ts',
      'src/features/sales/application/create-sale/useSaleForm.ts',
      'src/features/sales/application/create-sale/useSaleItemSelectionEffect.ts',
      'src/features/sales/domain/salesListLabels.ts',
      'src/features/sales/domain/types.ts',
      'src/features/sales/infrastructure/salesListData.ts',
      'src/features/sales/infrastructure/saleFormData.ts',
      'src/features/item-management/public/useIdentityData.ts',
    ];
    const forbiddenLegacySources = [...sourcePaths].filter(
      filePath =>
        filePath === 'src/features/sales/index.tsx' ||
        filePath.startsWith('src/features/sales/create-sale/') ||
        filePath.startsWith('src/features/sales/hooks/') ||
        filePath.startsWith('src/features/sales/list/')
    );
    const salesCreateSources = [...sourceByPath.entries()].filter(
      ([filePath]) =>
        filePath.startsWith('src/features/sales/application/create-sale/')
    );
    const violations = [
      ...requiredSources.flatMap(filePath =>
        sourcePaths.has(filePath) ? [] : [`sales layer is missing ${filePath}`]
      ),
      ...forbiddenLegacySources.map(
        filePath => `${filePath} uses legacy unlayered sales path`
      ),
      ...salesCreateSources.flatMap(([filePath, source]) =>
        getAllModuleSpecifiers(filePath, source).flatMap(specifier =>
          specifier === '@/hooks/queries'
            ? [
                `${filePath} imports master-data identities outside item-management public API`,
              ]
            : []
        )
      ),
    ];

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps purchase list workflow on layered feature ownership', () => {
    const requiredSources = [
      'src/features/purchase-management/pages/list/index.tsx',
      'src/features/purchase-management/application/list/usePurchaseListPage.ts',
      'src/features/purchase-management/domain/purchaseListLabels.ts',
      'src/features/purchase-management/domain/types.ts',
      'src/features/purchase-management/infrastructure/purchaseListData.ts',
    ];
    const forbiddenLegacySources = [...sourcePaths].filter(
      filePath =>
        filePath ===
          'src/features/purchase-management/pages/PurchaseListPage.tsx' ||
        filePath.startsWith(
          'src/features/purchase-management/pages/purchase-list/'
        ) ||
        filePath === 'src/hooks/queries/usePurchases.ts'
    );
    const violations = [
      ...requiredSources.flatMap(filePath =>
        sourcePaths.has(filePath)
          ? []
          : [`purchase list layer is missing ${filePath}`]
      ),
      ...forbiddenLegacySources.map(
        filePath => `${filePath} uses legacy purchase-list path`
      ),
    ];

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps purchase form workflow on layered feature ownership', () => {
    const requiredSources = [
      'src/features/purchase-management/application/form/usePurchaseForm.ts',
      'src/features/purchase-management/application/form/useItemSelectionEffect.ts',
      'src/features/purchase-management/domain/purchaseCalculations.ts',
      'src/features/purchase-management/infrastructure/purchaseFormData.ts',
      'src/features/purchase-management/components/purchase-form/usePurchaseModalAnimation.ts',
      'src/features/item-management/public/useSupplierData.ts',
    ];
    const forbiddenLegacySources = [...sourcePaths].filter(filePath =>
      filePath.startsWith('src/features/purchase-management/hooks/')
    );
    const purchaseFormSources = [...sourceByPath.entries()].filter(
      ([filePath]) =>
        filePath.startsWith(
          'src/features/purchase-management/application/form/'
        )
    );
    const violations = [
      ...requiredSources.flatMap(filePath =>
        sourcePaths.has(filePath)
          ? []
          : [`purchase form layer is missing ${filePath}`]
      ),
      ...forbiddenLegacySources.map(
        filePath => `${filePath} uses legacy purchase form hooks path`
      ),
      ...purchaseFormSources.flatMap(([filePath, source]) =>
        getAllModuleSpecifiers(filePath, source).flatMap(specifier =>
          specifier === '@/hooks/queries' ||
          specifier === '@/hooks/realtime/useSuppliersSync'
            ? [
                `${filePath} imports supplier data outside item-management public API`,
              ]
            : []
        )
      ),
    ];

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps purchase upload workflow on layered feature ownership', () => {
    const requiredSources = [
      'src/features/purchase-management/application/upload/useUploadInvoicePortal.ts',
      'src/features/purchase-management/application/upload/invoiceUploadStore.ts',
      'src/features/purchase-management/domain/uploadInvoiceUtils.ts',
      'src/features/purchase-management/infrastructure/uploadInvoiceData.ts',
    ];
    const forbiddenLegacySources = [...sourcePaths].filter(
      filePath =>
        filePath ===
          'src/features/purchase-management/components/useUploadInvoicePortal.ts' ||
        filePath ===
          'src/features/purchase-management/components/invoiceUploadStore.ts' ||
        filePath ===
          'src/features/purchase-management/components/uploadInvoiceData.ts' ||
        filePath ===
          'src/features/purchase-management/components/upload-invoice/uploadInvoiceUtils.ts'
    );
    const violations = [
      ...requiredSources.flatMap(filePath =>
        sourcePaths.has(filePath)
          ? []
          : [`purchase upload layer is missing ${filePath}`]
      ),
      ...forbiddenLegacySources.map(
        filePath => `${filePath} uses legacy purchase upload component path`
      ),
    ];

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps purchase document workflows on layered feature ownership', () => {
    const requiredSources = [
      'src/features/purchases/pages/confirm-invoice/index.tsx',
      'src/features/purchases/pages/view-purchase/index.tsx',
      'src/features/purchases/pages/print-purchase/index.tsx',
      'src/features/purchases/application/confirm-invoice/useConfirmInvoicePage.ts',
      'src/features/purchases/application/view-purchase/useViewPurchasePage.ts',
      'src/features/purchases/application/print-purchase/usePrintPurchasePage.ts',
      'src/features/purchases/domain/confirmInvoiceDisplay.ts',
      'src/features/purchases/domain/purchaseDocument.ts',
      'src/features/purchases/infrastructure/confirmInvoiceData.ts',
      'src/features/purchases/infrastructure/viewPurchaseData.ts',
    ];
    const forbiddenLegacySources = [...sourcePaths].filter(
      filePath =>
        filePath.startsWith('src/features/purchases/confirm-invoice/') ||
        filePath.startsWith('src/features/purchases/view-purchase/') ||
        filePath.startsWith('src/features/purchases/print-purchase/') ||
        filePath.startsWith('src/features/purchases/invoice-layout/') ||
        filePath === 'src/features/purchases/purchaseDocument.ts'
    );
    const violations = [
      ...requiredSources.flatMap(filePath =>
        sourcePaths.has(filePath)
          ? []
          : [`purchase document layer is missing ${filePath}`]
      ),
      ...forbiddenLegacySources.map(
        filePath => `${filePath} uses legacy purchases route-oriented path`
      ),
    ];

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps feature-owned UI state inside feature boundaries', () => {
    const forbiddenGlobalStatePaths = new Map([
      ['src/store/chatSidebarStore.ts', 'chat-sidebar open/target state'],
      ['src/store/invoiceUploadStore.ts', 'invoice upload file cache'],
    ]);
    const forbiddenGlobalStateSpecifiers = new Set([
      '@/store/chatSidebarStore',
      '@store/chatSidebarStore',
      '@/store/invoiceUploadStore',
      '@store/invoiceUploadStore',
    ]);
    const violations = [
      ...[...forbiddenGlobalStatePaths.entries()].flatMap(
        ([filePath, ownership]) =>
          sourcePaths.has(filePath)
            ? [`${filePath} owns feature-specific ${ownership}`]
            : []
      ),
      ...[...sourceByPath.entries()].flatMap(([filePath, source]) => {
        if (!isRuntimeSource(filePath) && !isTestSource(filePath)) return [];

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier =>
          forbiddenGlobalStateSpecifiers.has(specifier)
            ? [`${filePath} imports legacy feature-owned store ${specifier}`]
            : []
        );
      }),
    ];

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps feature data access imports inside data boundary modules', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (
          !isRuntimeSource(filePath) ||
          !filePath.startsWith('src/features/') ||
          isFeatureDataAccessBoundary(filePath)
        ) {
          return [];
        }

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return target.startsWith('src/services/') ||
            isSupabaseClientTarget(target)
            ? [`${filePath} imports data access module ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps feature domain modules free of React, app state, and data access dependencies', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (
          !isRuntimeSource(filePath) ||
          !/^src\/features\/[^/]+\/domain\//.test(filePath)
        ) {
          return [];
        }

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return isUiRuntimeSpecifier(specifier) ||
            isUiOrApplicationLayerTarget(target) ||
            isFeatureDataAccessBoundary(target) ||
            target.startsWith('src/services/') ||
            isSupabaseClientTarget(target)
            ? [`${filePath} imports non-domain runtime dependency ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps explicit data access helper lists pointed at existing sources', () => {
    const violations = [
      ...sharedHookStoreBridgeSources,
      ...storeDataAccessHelperSources,
      ...supabaseClientBoundarySources,
    ].filter(filePath => !sourcePaths.has(filePath));

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps feature data boundary modules free of UI and app dependencies', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (
          !isRuntimeSource(filePath) ||
          !isFeatureDataAccessBoundary(filePath)
        ) {
          return [];
        }

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return isUiRuntimeSpecifier(specifier) ||
            isUiOrApplicationLayerTarget(target)
            ? [`${filePath} imports UI/application dependency ${specifier}`]
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

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return getFeatureName(target) && !isFeaturePublicApiTarget(target)
            ? [`${filePath} imports feature internal ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps app feature imports on public APIs or route entries', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (!isRuntimeSource(filePath) || !filePath.startsWith('src/app/')) {
          return [];
        }

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return getFeatureName(target) &&
            !isFeaturePublicApiTarget(target) &&
            !isFeatureRouteEntryTarget(target)
            ? [`${filePath} imports feature implementation ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps app data access imports inside the bootstrap entrypoint', () => {
    const appDataAccessBoundarySources = new Set(['src/app/main.tsx']);
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (
          !isRuntimeSource(filePath) ||
          !filePath.startsWith('src/app/') ||
          appDataAccessBoundarySources.has(filePath)
        ) {
          return [];
        }

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return target.startsWith('src/services/') ||
            isStoreSideEffectTarget(target)
            ? [`${filePath} imports data access module ${specifier}`]
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

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
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

  it('keeps invalidation key sets out of single queryKey filters', () => {
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
            isGetInvalidationKeysCall(node.initializer)
          ) {
            const { line, character } =
              sourceFile.getLineAndCharacterOfPosition(
                node.initializer.getStart(sourceFile)
              );
            fileViolations.push(
              `${filePath}:${line + 1}:${character + 1} passes invalidation key set as one queryKey`
            );
          }

          ts.forEachChild(node, visit);
        };

        visit(sourceFile);
        return fileViolations;
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps party invalidation tied to transaction caches', () => {
    const forbiddenInvalidationCalls = new Set([
      'getInvalidationKeys.customers.all',
      'getInvalidationKeys.doctors.all',
      'getInvalidationKeys.patients.all',
    ]);
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (!isRuntimeSource(filePath)) return [];

        const sourceFile = parseSource(filePath, source);
        const fileViolations: string[] = [];

        const visit = (node: ts.Node) => {
          if (ts.isCallExpression(node)) {
            const callPath = getPropertyAccessSegments(node.expression)?.join(
              '.'
            );
            if (callPath && forbiddenInvalidationCalls.has(callPath)) {
              const { line, character } =
                sourceFile.getLineAndCharacterOfPosition(
                  node.expression.getStart(sourceFile)
                );
              fileViolations.push(
                `${filePath}:${line + 1}:${character + 1} uses ${callPath} instead of related party invalidation`
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

  it('keeps item invalidation tied to dashboard caches', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (!isRuntimeSource(filePath)) return [];

        const sourceFile = parseSource(filePath, source);
        const fileViolations: string[] = [];

        const visit = (node: ts.Node) => {
          if (ts.isCallExpression(node)) {
            const callPath = getPropertyAccessSegments(node.expression)?.join(
              '.'
            );
            if (callPath === 'getInvalidationKeys.items.all') {
              const { line, character } =
                sourceFile.getLineAndCharacterOfPosition(
                  node.expression.getStart(sourceFile)
                );
              fileViolations.push(
                `${filePath}:${line + 1}:${character + 1} uses ${callPath} instead of item-related invalidation`
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

  it('keeps repository modules behind service-owned entry points', () => {
    const allowedRepositoryConsumers = [
      'src/services/api/',
      'src/services/transformers/',
    ];
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (!isRuntimeSource(filePath)) return [];
        if (filePath.startsWith('src/services/repositories/')) return [];

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return target.startsWith('src/services/repositories/') &&
            !allowedRepositoryConsumers.some(prefix =>
              filePath.startsWith(prefix)
            )
            ? [`${filePath} imports repository module ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps service exception boundaries on normalized service errors', () => {
    const guardedSources = [...sourceByPath.entries()].filter(([filePath]) => {
      if (!isRuntimeSource(filePath)) return false;
      if (filePath === 'src/services/api/chat/contractErrors.ts') return false;

      return (
        filePath.startsWith('src/services/api/') ||
        filePath.startsWith('src/services/repositories/') ||
        filePath.startsWith('src/features/item-management/infrastructure/')
      );
    });
    const violations = guardedSources.flatMap(([filePath, source]) =>
      getTypeAssertions(filePath, source).flatMap(assertion =>
        assertion.typeIdentifiers.includes('PostgrestError')
          ? [`${assertion.location} casts values to PostgrestError`]
          : []
      )
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps runtime error handling on type guards instead of assertions', () => {
    const guardedSources = [...sourceByPath.entries()].filter(([filePath]) => {
      if (!isRuntimeSource(filePath)) return false;

      return (
        filePath.startsWith('src/services/') ||
        filePath.startsWith('src/features/') ||
        filePath.startsWith('src/lib/')
      );
    });
    const unsafeErrorAssertionTypes = new Set([
      'AuthError',
      'AxiosError',
      'Error',
      'PostgrestError',
    ]);
    const violations = guardedSources.flatMap(([filePath, source]) =>
      getTypeAssertions(filePath, source).flatMap(assertion => {
        const assertsUnsafeErrorType = assertion.typeIdentifiers.some(
          identifier => unsafeErrorAssertionTypes.has(identifier)
        );
        const assertsCaughtErrorVariable =
          assertion.expressionIdentifier === 'error' ||
          assertion.expressionIdentifier === 'err';
        const isIntentionalPostgrestFactory =
          filePath === 'src/services/api/chat/contractErrors.ts' &&
          assertion.typeIdentifiers.includes('PostgrestError');

        return isIntentionalPostgrestFactory
          ? []
          : assertsUnsafeErrorType || assertsCaughtErrorVariable
            ? [
                `${assertion.location} asserts caught error shape with "${assertion.text}"`,
              ]
            : [];
      })
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps item-management item data access behind feature infrastructure', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (
          !isRuntimeSource(filePath) ||
          !filePath.startsWith('src/features/item-management/') ||
          filePath.startsWith('src/features/item-management/infrastructure/')
        ) {
          return [];
        }

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return isModuleTarget(target, 'src/services/api/items.service') ||
            target.startsWith('src/services/repositories/')
            ? [`${filePath} imports item data access module ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps item detail hydration on typed infrastructure records', () => {
    const itemDataService =
      sourceByPath.get(
        'src/features/item-management/infrastructure/itemData.service.ts'
      ) ?? '';
    const useItemData =
      sourceByPath.get(
        'src/features/item-management/application/hooks/data/useItemData.ts'
      ) ?? '';
    const violations = [
      !itemDataService.includes('export interface ItemDataRecord')
        ? 'itemData.service.ts must expose the typed item detail record'
        : '',
      itemDataService.includes('ServiceResponse<Record<string, unknown>>')
        ? 'itemData.service.ts returns item details as Record<string, unknown>'
        : '',
      itemDataService.includes('error as PostgrestError')
        ? 'itemData.service.ts casts unknown exceptions to PostgrestError'
        : '',
      useItemData.includes('const itemRecord = itemData as Record')
        ? 'useItemData.ts casts hydration input to Record<string, unknown>'
        : '',
      useItemData.includes('hydrateItemData(itemData as Record')
        ? 'useItemData.ts casts fetched item details before hydration'
        : '',
    ].filter(Boolean);

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps item-management storage access behind feature infrastructure', () => {
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (
          !isRuntimeSource(filePath) ||
          !filePath.startsWith('src/features/item-management/') ||
          filePath.startsWith('src/features/item-management/infrastructure/')
        ) {
          return [];
        }

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return isModuleTarget(target, 'src/services/api/storage.service')
            ? [`${filePath} imports storage service ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps item-management UI and application layers behind feature infrastructure', () => {
    const guardedRoots = [
      'src/features/item-management/application/',
      'src/features/item-management/pages/',
      'src/features/item-management/presentation/',
      'src/features/item-management/shared/',
    ];
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (
          !isRuntimeSource(filePath) ||
          !guardedRoots.some(root => filePath.startsWith(root))
        ) {
          return [];
        }

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return target.startsWith('src/services/') ||
            isSupabaseClientTarget(target)
            ? [`${filePath} imports data access module ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps transaction form hooks behind feature infrastructure', () => {
    const formHookRoots = [
      'src/features/purchase-management/application/form/',
      'src/features/sales/application/create-sale/',
    ];
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (
          !isRuntimeSource(filePath) ||
          !formHookRoots.some(root => filePath.startsWith(root))
        ) {
          return [];
        }

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return target.startsWith('src/services/')
            ? [`${filePath} imports service module ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps purchase and invoice UI orchestration behind feature infrastructure', () => {
    const guardedRoots = [
      'src/features/purchases/',
      'src/features/purchase-management/components/',
    ];
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (
          !isRuntimeSource(filePath) ||
          !guardedRoots.some(root => filePath.startsWith(root)) ||
          isFeatureDataAccessBoundary(filePath)
        ) {
          return [];
        }

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return target.startsWith('src/services/')
            ? [`${filePath} imports service module ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps chat-sidebar UI and hooks behind data gateways', () => {
    const guardedRoots = [
      'src/features/chat-sidebar/components/',
      'src/features/chat-sidebar/hooks/',
      'src/features/chat-sidebar/utils/',
    ];
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (
          !isRuntimeSource(filePath) ||
          !guardedRoots.some(root => filePath.startsWith(root))
        ) {
          return [];
        }

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return target.startsWith('src/services/')
            ? [`${filePath} imports service module ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps route-mounted feature screens free of direct React Query orchestration', () => {
    const violations = [...getRouteMountedFeatureTargets()].flatMap(
      filePath => {
        const source = sourceByPath.get(filePath);

        if (!source) return [`${filePath} is missing`];

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier =>
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

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier => {
          const target = resolveImportTarget(filePath, specifier);

          return target.startsWith('src/services/')
            ? [`${filePath} imports data service ${specifier}`]
            : [];
        });
      }
    );

    expect(formatViolations(violations)).toBe('none');
  });

  it('keeps test framework imports out of runtime sources', () => {
    const testFrameworkSpecifiers = new Set(['vite-plus/test', 'vitest']);
    const violations = [...sourceByPath.entries()].flatMap(
      ([filePath, source]) => {
        if (!isRuntimeSource(filePath)) return [];

        return getAllModuleSpecifiers(filePath, source).flatMap(specifier =>
          testFrameworkSpecifiers.has(specifier) ||
          specifier.startsWith('@vitest/')
            ? [`${filePath} imports test framework ${specifier}`]
            : []
        );
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
