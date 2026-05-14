/// <reference types="vite-plus/client" />

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const sourceModules = import.meta.glob('../../**/*.{ts,tsx}', {
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

  return normalizeSegments(`src/components/combobox/${normalizedKey}`);
};

const sourceByPath = new Map(
  Object.entries(sourceModules)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([moduleKey, source]) => [normalizeSourcePath(moduleKey), source])
);
const sourcePaths = new Set(sourceByPath.keys());

const readSource = (relativePath: string) => {
  const source = sourceByPath.get(`src/components/combobox/${relativePath}`);
  if (source === undefined) {
    throw new Error(`Combobox architecture source missing: ${relativePath}`);
  }

  return source;
};

const parseSource = (fileName: string, source: string) =>
  ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

const getModuleSpecifiers = (filePath: string) => {
  const source = sourceByPath.get(filePath);
  if (source === undefined) {
    throw new Error(`Source fixture missing: ${filePath}`);
  }

  const sourceFile = parseSource(filePath, source);
  const moduleSpecifiers: {
    isTypeOnly: boolean;
    specifier: string;
  }[] = [];

  sourceFile.forEachChild(node => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      moduleSpecifiers.push({
        isTypeOnly: Boolean(
          ts.isImportDeclaration(node)
            ? node.importClause?.isTypeOnly
            : node.isTypeOnly
        ),
        specifier: node.moduleSpecifier.text,
      });
    }
  });

  return moduleSpecifiers;
};

const resolveLocalSpecifier = (fromFile: string, specifier: string) => {
  if (!specifier.startsWith('.')) return null;

  const directory = fromFile.split('/').slice(0, -1).join('/');
  const resolvedPath = normalizeSegments(`${directory}/${specifier}`);
  const candidates = [
    resolvedPath,
    `${resolvedPath}.ts`,
    `${resolvedPath}.tsx`,
    `${resolvedPath}/index.ts`,
    `${resolvedPath}/index.tsx`,
  ];

  return candidates.find(candidate => sourcePaths.has(candidate)) ?? null;
};

const getDirectImportSpecifiers = (relativePath: string) =>
  getModuleSpecifiers(`src/components/combobox/${relativePath}`).map(
    moduleSpecifier => moduleSpecifier.specifier
  );

const legacyFlatPresetProps: string[] = [
  'aria-describedby',
  'aria-label',
  'aria-labelledby',
  'className',
  'createAction',
  'disabled',
  'emptyText',
  'form',
  'id',
  'indicator',
  'isItemDisabled',
  'isItemEqualToValue',
  'isValueEmpty',
  'itemToHoverDetailData',
  'itemToStringLabel',
  'itemToStringValue',
  'label',
  'name',
  'onFetchHoverDetail',
  'onFetchHoverDetailError',
  'onOpenChange',
  'open',
  'placeholder',
  'popupClassName',
  'popupContainerRef',
  'popupMatchAnchorWidth',
  'readOnly',
  'renderOption',
  'renderOptionMeta',
  'required',
  'searchable',
  'searchPlaceholder',
  'tabIndex',
  'visibleItemLimit',
];

const getInterfacePropertyNames = (
  sourceFile: ts.SourceFile,
  interfaceName: string
) => {
  const propertyNames: string[] = [];

  sourceFile.forEachChild(node => {
    if (!ts.isInterfaceDeclaration(node) || node.name.text !== interfaceName) {
      return;
    }

    for (const member of node.members) {
      if (!ts.isPropertySignature(member)) continue;
      propertyNames.push(
        member.name.getText(sourceFile).replaceAll(/['"]/g, '')
      );
    }
  });

  return propertyNames;
};

describe('Combobox primitive architecture', () => {
  it('keeps public exports on the safe typed primitive API', () => {
    const publicExports = getModuleSpecifiers(
      'src/components/combobox/index.ts'
    );
    const primitiveValueExports = publicExports.filter(
      moduleSpecifier =>
        moduleSpecifier.specifier === './primitive' &&
        !moduleSpecifier.isTypeOnly
    );

    expect(primitiveValueExports).toEqual([]);
  });

  it('keeps unsafe primitive imports inside the combobox package', () => {
    const illegalImports = Array.from(sourcePaths).flatMap(filePath => {
      if (filePath.startsWith('src/components/combobox/')) {
        return [];
      }

      const source = sourceByPath.get(filePath);
      if (source === undefined || !source.includes('combobox/primitive')) {
        return [];
      }

      return getModuleSpecifiers(filePath)
        .filter(moduleSpecifier => {
          if (moduleSpecifier.isTypeOnly) return false;
          if (moduleSpecifier.specifier === '@/components/combobox/primitive') {
            return true;
          }

          return (
            resolveLocalSpecifier(filePath, moduleSpecifier.specifier) ===
            'src/components/combobox/primitive.tsx'
          );
        })
        .map(moduleSpecifier => `${filePath} -> ${moduleSpecifier.specifier}`);
    });

    expect(illegalImports).toEqual([]);
  });

  it('keeps primitive root state as orchestration instead of owning mechanics', () => {
    const source = readSource('primitive-root-state.ts');
    const directImports = getDirectImportSpecifiers('primitive-root-state.ts');
    const forbiddenPrimitiveRootImports = [
      './utils/primitive-focus-outside',
      './utils/primitive-keyboard',
      './utils/primitive-outside-press',
      './utils/primitive-root',
    ];

    expect(
      directImports.filter(importPath =>
        forbiddenPrimitiveRootImports.includes(importPath)
      )
    ).toEqual([]);
    expect(source).not.toMatch(/\buse(?:Callback|Effect|Ref|State)\b/);
    expect(source).not.toContain('createComboboxEventDetails');
  });

  it('keeps primitive context split by static, state, and actions', () => {
    const source = readSource('primitive-context.ts');

    expect(source).toContain('ComboboxStaticContext');
    expect(source).toContain('ComboboxStateContext');
    expect(source).toContain('ComboboxActionsContext');
    expect(source).not.toContain('export const ComboboxContext');
  });
});

describe('Combobox preset architecture', () => {
  it('keeps the public preset props grouped by domain', () => {
    const source = readSource('presets-types.ts');
    const sourceFile = parseSource('presets-types.ts', source);
    const rootProps = getInterfacePropertyNames(
      sourceFile,
      'PharmaComboboxSelectProps'
    );

    expect(rootProps.sort()).toEqual([
      'creation',
      'display',
      'field',
      'hoverDetail',
      'interaction',
      'item',
      'items',
      'onValueChange',
      'popup',
      'search',
      'validation',
      'value',
    ]);
    expect(
      rootProps.filter(prop => legacyFlatPresetProps.includes(prop))
    ).toEqual([]);
  });

  it('keeps preset JSX call sites off the legacy flat props', () => {
    const flatLegacyProps = new Set(legacyFlatPresetProps);
    const legacyAttributes: string[] = [];

    for (const [filePath, source] of sourceByPath) {
      if (
        !source.includes('PharmaComboboxSelect') &&
        !source.includes('PharmaEntityComboboxSelect')
      ) {
        continue;
      }

      const sourceFile = parseSource(filePath, source);
      const visit = (node: ts.Node) => {
        if (ts.isJsxSelfClosingElement(node)) {
          const tagName = node.tagName.getText(sourceFile);
          if (
            tagName === 'PharmaComboboxSelect' ||
            tagName === 'PharmaEntityComboboxSelect'
          ) {
            for (const attribute of node.attributes.properties) {
              if (!ts.isJsxAttribute(attribute)) continue;
              const attributeName = attribute.name.getText(sourceFile);
              if (flatLegacyProps.has(attributeName)) {
                legacyAttributes.push(`${filePath}: ${attributeName}`);
              }
            }
          }
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
    }

    expect(legacyAttributes).toEqual([]);
  });

  it('keeps preset boundary mappers grouped by domain', () => {
    const source = readSource('utils/preset-controller-props.ts');
    const sourceFile = parseSource('utils/preset-controller-props.ts', source);

    expect(
      getInterfacePropertyNames(
        sourceFile,
        'PharmaComboboxRootPropsOptions'
      ).sort()
    ).toEqual(['formatters', 'handlers', 'interaction', 'state']);
    expect(
      getInterfacePropertyNames(
        sourceFile,
        'PharmaComboboxViewPropsOptions'
      ).sort()
    ).toEqual([
      'accessibility',
      'actions',
      'display',
      'interaction',
      'refs',
      'state',
      'validation',
    ]);
  });

  it('keeps highlight controller dependencies grouped by domain', () => {
    const source = readSource('hooks/use-combobox-highlight.ts');
    const sourceFile = parseSource('hooks/use-combobox-highlight.ts', source);

    expect(
      getInterfacePropertyNames(sourceFile, 'ComboboxHighlightOptions').sort()
    ).toEqual([
      'creation',
      'hoverDetail',
      'interaction',
      'scroll',
      'search',
      'selection',
    ]);
  });

  it('keeps preset value and search helpers split by responsibility', () => {
    const presetSearchSource = readSource('utils/preset-search.ts');
    const presetValueSource = readSource('utils/preset-value.ts');

    expect(
      sourcePaths.has('src/components/combobox/utils/preset-state.ts')
    ).toBe(false);
    expect(presetSearchSource).toContain('getComboboxSearchState');
    expect(presetSearchSource).not.toContain('getComboboxControlName');
    expect(presetSearchSource).not.toContain('getDuplicateComboboxOptionValue');
    expect(presetValueSource).toContain('getComboboxSelectedValue');
    expect(presetValueSource).toContain('getDuplicateComboboxOptionValue');
    expect(presetValueSource).not.toContain('getComboboxSearchState');
  });

  it('keeps the select controller from owning low-level combobox behavior', () => {
    const directImports = getDirectImportSpecifiers(
      'hooks/use-pharma-combobox-select-controller.ts'
    );
    const forbiddenBoundaryImports = [
      '../utils/preset-controller-props',
      '../utils/preset-item',
      'react',
      './use-combobox-focus-restore',
      './use-combobox-option-interaction',
      './use-combobox-search-result-scroll',
      './use-combobox-selected-option-scroll',
      './use-pharma-combobox-core-state',
      './use-pharma-combobox-feedback',
      './use-pharma-combobox-open-lifecycle',
      './use-pharma-combobox-selection-model',
    ];

    expect(
      directImports.filter(importPath =>
        forbiddenBoundaryImports.includes(importPath)
      )
    ).toEqual([]);
  });

  it('keeps option interaction as a domain facade instead of a low-level orchestrator', () => {
    const directImports = getDirectImportSpecifiers(
      'hooks/use-combobox-option-interaction.ts'
    );
    const forbiddenBoundaryImports = [
      '../utils/preset-dom',
      './use-combobox-highlight',
      './use-combobox-hover-detail-controller',
      './use-combobox-keyboard-highlight-scroll',
      './use-combobox-keyboard-hover-detail-sync',
      './use-combobox-pointer-hover',
      './use-combobox-scroll-hover-detail-sync',
    ];

    expect(
      directImports.filter(importPath =>
        forbiddenBoundaryImports.includes(importPath)
      )
    ).toEqual([]);
  });
});
