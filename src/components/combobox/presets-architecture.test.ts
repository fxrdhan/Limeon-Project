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
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
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

const getDirectImportTargets = (relativePath: string) => {
  const filePath = `src/components/combobox/${relativePath}`;

  return getModuleSpecifiers(filePath).map(
    moduleSpecifier =>
      resolveLocalSpecifier(filePath, moduleSpecifier.specifier) ??
      moduleSpecifier.specifier
  );
};

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

const getPropertyNameText = (
  name: ts.PropertyName,
  sourceFile: ts.SourceFile
) =>
  ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)
    ? name.text
    : name.getText(sourceFile);

const getExportedValueNames = (sourceFile: ts.SourceFile) => {
  const exportedNames: string[] = [];

  sourceFile.forEachChild(node => {
    const modifiers = ts.canHaveModifiers(node)
      ? ts.getModifiers(node)
      : undefined;
    const isExported = modifiers?.some(
      modifier => modifier.kind === ts.SyntaxKind.ExportKeyword
    );
    if (!isExported) return;

    if (ts.isFunctionDeclaration(node) && node.name) {
      exportedNames.push(node.name.text);
      return;
    }

    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          exportedNames.push(declaration.name.text);
        }
      }
    }
  });

  return exportedNames;
};

const getFunctionReturnObjectPropertyNames = (
  sourceFile: ts.SourceFile,
  functionName: string
) => {
  const returnedPropertyNames: string[] = [];

  const visit = (node: ts.Node) => {
    if (
      !ts.isFunctionDeclaration(node) ||
      node.name?.text !== functionName ||
      !node.body
    ) {
      ts.forEachChild(node, visit);
      return;
    }

    const visitFunctionBody = (bodyNode: ts.Node) => {
      if (
        ts.isReturnStatement(bodyNode) &&
        bodyNode.expression &&
        ts.isObjectLiteralExpression(bodyNode.expression)
      ) {
        for (const property of bodyNode.expression.properties) {
          if (
            ts.isPropertyAssignment(property) ||
            ts.isShorthandPropertyAssignment(property)
          ) {
            returnedPropertyNames.push(
              getPropertyNameText(property.name, sourceFile)
            );
          }
        }
      }

      ts.forEachChild(bodyNode, visitFunctionBody);
    };

    ts.forEachChild(node.body, visitFunctionBody);
  };

  visit(sourceFile);

  return returnedPropertyNames;
};

const getJsxAttributeNames = (sourceFile: ts.SourceFile, tagName: string) => {
  const attributeNames: string[] = [];

  const visit = (node: ts.Node) => {
    if (
      ts.isJsxElement(node) &&
      node.openingElement.tagName.getText(sourceFile) === tagName
    ) {
      for (const attribute of node.openingElement.attributes.properties) {
        if (ts.isJsxAttribute(attribute)) {
          attributeNames.push(attribute.name.getText(sourceFile));
        }
      }
    }

    if (
      ts.isJsxSelfClosingElement(node) &&
      node.tagName.getText(sourceFile) === tagName
    ) {
      for (const attribute of node.attributes.properties) {
        if (ts.isJsxAttribute(attribute)) {
          attributeNames.push(attribute.name.getText(sourceFile));
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return attributeNames;
};

const getCreateElementPropNames = (
  sourceFile: ts.SourceFile,
  componentName: string
) => {
  const propNames: string[] = [];

  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(sourceFile) === 'React.createElement' &&
      node.arguments[0]?.getText(sourceFile) === componentName
    ) {
      const propsArgument = node.arguments[1];

      if (propsArgument && ts.isObjectLiteralExpression(propsArgument)) {
        for (const property of propsArgument.properties) {
          if (
            ts.isPropertyAssignment(property) ||
            ts.isShorthandPropertyAssignment(property) ||
            ts.isMethodDeclaration(property)
          ) {
            propNames.push(getPropertyNameText(property.name, sourceFile));
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return propNames;
};

const isProductionComboboxSource = (filePath: string) =>
  filePath.startsWith('src/components/combobox/') &&
  !filePath.includes('.test.');

describe('Combobox primitive architecture', () => {
  it('keeps public exports on the safe typed primitive API', () => {
    const publicExports = getModuleSpecifiers(
      'src/components/combobox/index.ts'
    );
    const rawPrimitiveExportSpecifiers = new Set([
      './internal/primitive',
      './primitive',
    ]);
    const primitiveValueExports = publicExports.filter(
      moduleSpecifier =>
        rawPrimitiveExportSpecifiers.has(moduleSpecifier.specifier) &&
        !moduleSpecifier.isTypeOnly
    );

    expect(primitiveValueExports).toEqual([]);
  });

  it('keeps unsafe primitive imports inside the combobox package', () => {
    const forbiddenRawPrimitiveSpecifiers = new Set([
      '@/components/combobox/internal/primitive',
      '@/components/combobox/internal/primitive.tsx',
      '@/components/combobox/primitive',
      '@/components/combobox/primitive.tsx',
    ]);
    const forbiddenRawPrimitiveTargets = new Set([
      'src/components/combobox/internal/primitive.tsx',
      'src/components/combobox/primitive.tsx',
    ]);
    const illegalImports = Array.from(sourcePaths).flatMap(filePath => {
      if (filePath.startsWith('src/components/combobox/')) {
        return [];
      }

      return getModuleSpecifiers(filePath)
        .filter(moduleSpecifier => {
          const resolvedSpecifier = resolveLocalSpecifier(
            filePath,
            moduleSpecifier.specifier
          );

          return (
            forbiddenRawPrimitiveSpecifiers.has(moduleSpecifier.specifier) ||
            (resolvedSpecifier !== null &&
              forbiddenRawPrimitiveTargets.has(resolvedSpecifier))
          );
        })
        .map(moduleSpecifier => `${filePath} -> ${moduleSpecifier.specifier}`);
    });

    expect(illegalImports).toEqual([]);
  });

  it('keeps the legacy raw primitive import path unavailable', () => {
    expect(sourcePaths.has('src/components/combobox/primitive.tsx')).toBe(
      false
    );
  });

  it('keeps primitive root state as orchestration instead of owning mechanics', () => {
    const source = readSource('primitive-root-state.ts');
    const directImportTargets = getDirectImportTargets(
      'primitive-root-state.ts'
    );
    const forbiddenPrimitiveRootImportTargets = [
      'src/components/combobox/utils/primitive-focus-outside.ts',
      'src/components/combobox/utils/primitive-keyboard.ts',
      'src/components/combobox/utils/primitive-outside-press.ts',
      'src/components/combobox/utils/primitive-root.ts',
    ];

    expect(
      directImportTargets.filter(importPath =>
        forbiddenPrimitiveRootImportTargets.includes(importPath)
      )
    ).toEqual([]);
    expect(source).not.toMatch(/\buse(?:Callback|Effect|Ref|State)\b/);
    expect(source).not.toContain('createComboboxEventDetails');
  });

  it('keeps primitive context split by static, state, and actions', () => {
    const source = readSource('primitive-context.ts');
    const sourceFile = parseSource('primitive-context.ts', source);
    const exportedValueNames = getExportedValueNames(sourceFile);

    expect(exportedValueNames).toEqual(
      expect.arrayContaining([
        'ComboboxActionsContext',
        'ComboboxStateContext',
        'ComboboxStaticContext',
      ])
    );
    expect(exportedValueNames).not.toContain('ComboboxContext');
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

  it('keeps the preset view model grouped by render domain', () => {
    const source = readSource('utils/preset-controller-view-model.ts');
    const sourceFile = parseSource(
      'utils/preset-controller-view-model.ts',
      source
    );

    expect(
      getFunctionReturnObjectPropertyNames(
        sourceFile,
        'getPharmaComboboxViewModel'
      ).sort()
    ).toEqual([
      'feedback',
      'highlight',
      'hoverDetail',
      'options',
      'popup',
      'root',
      'search',
      'trigger',
    ]);
  });

  it('keeps preset portal wiring on refs instead of ref snapshots', () => {
    const source = readSource('presets.tsx');
    const sourceFile = parseSource('presets.tsx', source);
    const portalAttributes = getJsxAttributeNames(
      sourceFile,
      'Combobox.Portal'
    );

    expect(portalAttributes).toContain('containerRef');
    expect(portalAttributes).not.toContain('container');
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
    const presetSearchExports = getExportedValueNames(
      parseSource('utils/preset-search.ts', presetSearchSource)
    );
    const presetValueExports = getExportedValueNames(
      parseSource('utils/preset-value.ts', presetValueSource)
    );

    expect(
      sourcePaths.has('src/components/combobox/utils/preset-state.ts')
    ).toBe(false);
    expect(presetSearchExports).toContain('getComboboxSearchState');
    expect(presetSearchExports).not.toContain('getComboboxControlName');
    expect(presetSearchExports).not.toContain(
      'getDuplicateComboboxOptionValue'
    );
    expect(presetValueExports).toContain('getComboboxSelectedValue');
    expect(presetValueExports).toContain('getDuplicateComboboxOptionValue');
    expect(presetValueExports).not.toContain('getComboboxSearchState');
  });

  it('keeps the select controller from owning low-level combobox behavior', () => {
    const directImportTargets = getDirectImportTargets(
      'hooks/use-pharma-combobox-select-controller.ts'
    );
    const forbiddenBoundaryImportTargets = [
      'react',
      'src/components/combobox/hooks/use-combobox-focus-restore.ts',
      'src/components/combobox/hooks/use-combobox-option-interaction.ts',
      'src/components/combobox/hooks/use-combobox-search-result-scroll.ts',
      'src/components/combobox/hooks/use-combobox-selected-option-scroll.ts',
      'src/components/combobox/hooks/use-pharma-combobox-core-state.ts',
      'src/components/combobox/hooks/use-pharma-combobox-feedback.ts',
      'src/components/combobox/hooks/use-pharma-combobox-open-lifecycle.ts',
      'src/components/combobox/hooks/use-pharma-combobox-selection-model.ts',
      'src/components/combobox/utils/preset-controller-props.ts',
      'src/components/combobox/utils/preset-item.ts',
    ];

    expect(
      directImportTargets.filter(importPath =>
        forbiddenBoundaryImportTargets.includes(importPath)
      )
    ).toEqual([]);
  });

  it('keeps option interaction as a domain facade instead of a low-level orchestrator', () => {
    const directImportTargets = getDirectImportTargets(
      'hooks/use-combobox-option-interaction.ts'
    );
    const allowedFacadeImportTargets = [
      'src/components/combobox/hooks/use-combobox-option-interaction-model.ts',
      'src/components/combobox/hooks/use-combobox-option-interaction-types.ts',
    ];

    expect(directImportTargets.sort()).toEqual(allowedFacadeImportTargets);
  });

  it('keeps the option interaction model on domain sub-facades', () => {
    const directImportTargets = getDirectImportTargets(
      'hooks/use-combobox-option-interaction-model.ts'
    );
    const requiredSubFacadeImportTargets = [
      'src/components/combobox/hooks/use-combobox-option-interaction-hover-state.ts',
      'src/components/combobox/hooks/use-combobox-option-interaction-infrastructure.ts',
      'src/components/combobox/hooks/use-combobox-option-interaction-keyboard-navigation.ts',
      'src/components/combobox/hooks/use-combobox-option-interaction-scroll-hover-sync.ts',
    ];
    const forbiddenBoundaryImportTargets = [
      'src/components/combobox/hooks/use-combobox-highlight.ts',
      'src/components/combobox/hooks/use-combobox-hover-detail-controller.ts',
      'src/components/combobox/hooks/use-combobox-keyboard-hover-detail-timer.ts',
      'src/components/combobox/hooks/use-combobox-keyboard-highlight-scroll.ts',
      'src/components/combobox/hooks/use-combobox-option-elements.ts',
      'src/components/combobox/hooks/use-combobox-option-hover.ts',
      'src/components/combobox/hooks/use-combobox-option-hover-detail-sync.ts',
      'src/components/combobox/hooks/use-combobox-option-keyboard-navigation.ts',
      'src/components/combobox/hooks/use-combobox-option-keyboard-scroll.ts',
      'src/components/combobox/hooks/use-combobox-pointer-hover.ts',
      'src/components/combobox/hooks/use-combobox-scroll-hover-detail-sync.ts',
      'src/components/combobox/utils/preset-dom.ts',
    ];

    expect(directImportTargets).toEqual(
      expect.arrayContaining(requiredSubFacadeImportTargets)
    );
    expect(
      directImportTargets.filter(importPath =>
        forbiddenBoundaryImportTargets.includes(importPath)
      )
    ).toEqual([]);
  });

  it('keeps preset disabled state canonical at the primitive root boundary', () => {
    const disabledItemProps = Array.from(sourceByPath).flatMap(
      ([filePath, source]) => {
        if (!isProductionComboboxSource(filePath)) return [];

        const sourceFile = parseSource(filePath, source);
        const itemProps = [
          ...getJsxAttributeNames(sourceFile, 'Combobox.Item'),
          ...getCreateElementPropNames(sourceFile, 'Combobox.Item'),
        ];

        return itemProps.includes('disabled')
          ? [`${filePath}: Combobox.Item disabled`]
          : [];
      }
    );
    const rootPropsSource = readSource('utils/preset-controller-props.ts');
    const typedPrimitiveSource = readSource('primitive-typed.ts');

    expect(rootPropsSource).toContain(
      'isItemDisabled: formatters.isItemDisabled'
    );
    expect(disabledItemProps).toEqual([]);
    expect(typedPrimitiveSource).toContain("'disabled' | 'index' | 'value'");
  });
});
