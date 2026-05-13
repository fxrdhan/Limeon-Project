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

describe('Combobox primitive architecture', () => {
  it('keeps primitive root state as orchestration instead of owning stateful mechanics', () => {
    const forbiddenPrimitiveRootImports = [
      './utils/primitive-focus-outside',
      './utils/primitive-keyboard',
      './utils/primitive-outside-press',
      './utils/primitive-root',
    ];
    const leakedImports = forbiddenPrimitiveRootImports.filter(
      importPath =>
        primitiveRootStateSource.includes(`from '${importPath}'`) ||
        primitiveRootStateSource.includes(`from "${importPath}"`)
    );
    const rootStateFunctionSource = primitiveRootStateSource.slice(
      primitiveRootStateSource.indexOf('export function useComboboxRootState')
    );
    const executableLineCount = rootStateFunctionSource
      .split('\n')
      .filter((line: string) => {
        const trimmedLine = line.trim();
        return (
          trimmedLine.length > 0 &&
          !trimmedLine.startsWith('//') &&
          !trimmedLine.startsWith('type ')
        );
      }).length;

    expect(leakedImports).toEqual([]);
    expect(primitiveRootStateSource).not.toMatch(
      /\buse(?:Callback|Effect|Ref|State)\b/
    );
    expect(primitiveRootStateSource).not.toContain(
      'createComboboxEventDetails'
    );
    expect(executableLineCount).toBeLessThanOrEqual(280);
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
    const leakedImports = forbiddenBoundaryImports.filter(
      importPath =>
        selectControllerSource.includes(`from '${importPath}'`) ||
        selectControllerSource.includes(`from "${importPath}"`)
    );
    const executableLineCount = selectControllerSource
      .split('\n')
      .filter((line: string) => line.trim().length > 0).length;

    expect(leakedImports).toEqual([]);
    expect(executableLineCount).toBeLessThanOrEqual(30);
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
    const leakedImports = forbiddenBoundaryImports.filter(
      importPath =>
        optionInteractionSource.includes(`from '${importPath}'`) ||
        optionInteractionSource.includes(`from "${importPath}"`)
    );
    const executableLineCount = optionInteractionSource
      .split('\n')
      .filter((line: string) => line.trim().length > 0).length;

    expect(leakedImports).toEqual([]);
    expect(executableLineCount).toBeLessThanOrEqual(220);
  });
});
