import { describe, expect, it } from 'vite-plus/test';
import { createTypedCombobox } from './index';

type Fruit = {
  id: string;
  name: string;
};

const FruitCombobox = createTypedCombobox<Fruit>();
const fruitItems: Fruit[] = [{ id: 'apple', name: 'Apple' }];

function TypedComboboxContractExamples() {
  return (
    <FruitCombobox.Root
      items={fruitItems}
      itemToStringLabel={item => item.name}
      itemToStringValue={item => item.id}
    >
      <FruitCombobox.List>
        {item => (
          <>
            <FruitCombobox.Item>{item.name}</FruitCombobox.Item>

            {/* @ts-expect-error value is provided by the typed list scope. */}
            <FruitCombobox.Item value={item}>{item.name}</FruitCombobox.Item>

            {/* @ts-expect-error index is provided by the typed list scope. */}
            <FruitCombobox.Item index={0}>{item.name}</FruitCombobox.Item>

            {/* @ts-expect-error disabled state belongs on Root.isItemDisabled so keyboard navigation and rendered options share one source. */}
            <FruitCombobox.Item disabled>{item.name}</FruitCombobox.Item>
          </>
        )}
      </FruitCombobox.List>
    </FruitCombobox.Root>
  );
}

describe('createTypedCombobox contract', () => {
  it('keeps typed items scoped to the typed list callback', () => {
    expect(TypedComboboxContractExamples).toBeTypeOf('function');
  });
});
