import { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import EnhancedSearchBar from '@/components/search-bar/EnhancedSearchBar';
import type { SearchColumn } from '@/components/search-bar/types';

export function Harness() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [clearCount, setClearCount] = useState(0);

  const columns = useMemo<SearchColumn[]>(
    () => [
      {
        field: 'name',
        headerName: 'Nama',
        searchable: true,
        type: 'text',
      },
      {
        field: 'stock',
        headerName: 'Stok',
        searchable: true,
        type: 'number',
      },
      {
        field: 'category',
        headerName: 'Kategori',
        searchable: true,
        type: 'text',
      },
    ],
    []
  );

  return (
    <main style={{ margin: '24px', maxWidth: '960px' }}>
      <h1>EnhancedSearchBar Playwright Harness</h1>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <button
          type="button"
          onClick={() => setValue('#name #contains aspirin##')}
          data-testid="preset-single"
        >
          preset-single
        </button>
        <button
          type="button"
          onClick={() =>
            setValue('#name #contains aspirin #and #stock #inRange 10 #to 20##')
          }
          data-testid="preset-multi-between"
        >
          preset-multi-between
        </button>
        <button
          type="button"
          onClick={() => setValue('#stock #equals 10##')}
          data-testid="preset-stock-single"
        >
          preset-stock-single
        </button>
        <button
          type="button"
          onClick={() => setValue('#name #contains aspirin #')}
          data-testid="preset-join-selector"
        >
          preset-join-selector
        </button>
        <button
          type="button"
          onClick={() => setValue('#name #contains aspirin #and #')}
          data-testid="preset-interrupted-column"
        >
          preset-interrupted-column
        </button>
        <button
          type="button"
          onClick={() => setValue('#name #contains aspirin #')}
          data-testid="preset-interrupted-join"
        >
          preset-interrupted-join
        </button>
        <button
          type="button"
          onClick={() => setValue('#name #contains aspirin #and #stock #')}
          data-testid="preset-interrupted-operator-multicol"
        >
          preset-interrupted-operator-multicol
        </button>
        <button
          type="button"
          onClick={() =>
            setValue('#name #contains aspirin #and #stock #equals ')
          }
          data-testid="preset-interrupted-partial"
        >
          preset-interrupted-partial
        </button>
        <button
          type="button"
          onClick={() =>
            setValue(
              '#name #contains aspirin #and #stock #equals 10 #and #category #contains pain##'
            )
          }
          data-testid="preset-insert-tail-multicondition"
        >
          preset-insert-tail-multicondition
        </button>
        <button
          type="button"
          onClick={() =>
            setValue('#name #contains aspirin #and #stock #equals 10 #and #')
          }
          data-testid="preset-condition-n-building"
        >
          preset-condition-n-building
        </button>
        <button
          type="button"
          onClick={() => {
            setValue('');
            setClearCount(0);
          }}
          data-testid="preset-reset"
        >
          preset-reset
        </button>
      </div>

      <EnhancedSearchBar
        value={value}
        onChange={e => setValue(e.target.value)}
        onClearSearch={() => {
          setClearCount(prev => prev + 1);
          setValue('');
        }}
        columns={columns}
        inputRef={inputRef}
      />

      <div data-testid="live-value">{value}</div>
      <div data-testid="clear-count">{clearCount}</div>
      <div data-testid="focused-tag">
        {document.activeElement instanceof HTMLElement
          ? document.activeElement.tagName
          : ''}
      </div>
    </main>
  );
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Harness root element not found');
}

createRoot(rootElement).render(<Harness />);
