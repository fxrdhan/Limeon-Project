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
