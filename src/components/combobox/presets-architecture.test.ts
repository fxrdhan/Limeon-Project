import { describe, expect, it } from 'vitest';

declare global {
  interface ImportMeta {
    glob: (
      pattern: string,
      options: {
        eager: true;
        import: 'default';
        query: '?raw';
      }
    ) => Record<string, unknown>;
  }
}

const controllerSources = import.meta.glob(
  './hooks/use-pharma-combobox-select-controller.ts',
  {
    eager: true,
    import: 'default',
    query: '?raw',
  }
);
const selectControllerSource =
  controllerSources['./hooks/use-pharma-combobox-select-controller.ts'];

if (typeof selectControllerSource !== 'string') {
  throw new Error('Combobox select controller source fixture is missing.');
}

const interactionSources = import.meta.glob(
  './hooks/use-combobox-option-interaction.ts',
  {
    eager: true,
    import: 'default',
    query: '?raw',
  }
);
const optionInteractionSource =
  interactionSources['./hooks/use-combobox-option-interaction.ts'];

if (typeof optionInteractionSource !== 'string') {
  throw new Error('Combobox option interaction source fixture is missing.');
}

const primitiveRootStateSources = import.meta.glob(
  './primitive-root-state.ts',
  {
    eager: true,
    import: 'default',
    query: '?raw',
  }
);
const primitiveRootStateSource =
  primitiveRootStateSources['./primitive-root-state.ts'];

if (typeof primitiveRootStateSource !== 'string') {
  throw new Error('Combobox primitive root state source fixture is missing.');
}

const getLeakedImports = (source: string, importPaths: string[]) =>
  importPaths.filter(
    importPath =>
      source.includes(`from '${importPath}'`) ||
      source.includes(`from "${importPath}"`)
  );

describe('Combobox primitive architecture', () => {
  it('keeps primitive root state as orchestration instead of owning stateful mechanics', () => {
    const forbiddenPrimitiveRootImports = [
      './utils/primitive-focus-outside',
      './utils/primitive-keyboard',
      './utils/primitive-outside-press',
      './utils/primitive-root',
    ];
    const leakedImports = getLeakedImports(
      primitiveRootStateSource,
      forbiddenPrimitiveRootImports
    );

    expect(leakedImports).toEqual([]);
    expect(primitiveRootStateSource).not.toMatch(
      /\buse(?:Callback|Effect|Ref|State)\b/
    );
    expect(primitiveRootStateSource).not.toContain(
      'createComboboxEventDetails'
    );
  });
});

describe('Combobox preset architecture', () => {
  it('keeps the select controller from owning low-level combobox behavior', () => {
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
    const leakedImports = getLeakedImports(
      selectControllerSource,
      forbiddenBoundaryImports
    );

    expect(leakedImports).toEqual([]);
  });

  it('keeps option interaction as a domain facade instead of a low-level orchestrator', () => {
    const forbiddenBoundaryImports = [
      '../utils/preset-dom',
      './use-combobox-highlight',
      './use-combobox-hover-detail-controller',
      './use-combobox-keyboard-highlight-scroll',
      './use-combobox-keyboard-hover-detail-sync',
      './use-combobox-pointer-hover',
      './use-combobox-scroll-hover-detail-sync',
    ];
    const leakedImports = getLeakedImports(
      optionInteractionSource,
      forbiddenBoundaryImports
    );

    expect(leakedImports).toEqual([]);
  });
});
