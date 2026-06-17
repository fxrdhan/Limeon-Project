import { render } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import DataGrid from './DataGrid';

const { agGridApiMock } = vi.hoisted(() => ({
  agGridApiMock: {
    autoSizeAllColumns: vi.fn(),
    autoSizeColumns: vi.fn(),
    isDestroyed: vi.fn(() => false),
    sizeColumnsToFit: vi.fn(),
  },
}));

vi.mock('ag-grid-react', async () => {
  const React = await import('react');

  type AgGridReactMockProps = {
    onFirstDataRendered?: (event: { api: typeof agGridApiMock }) => void;
  };
  type MockRef = ((value: unknown) => void) | { current: unknown } | null;

  const assignRef = (ref: MockRef, value: unknown) => {
    if (typeof ref === 'function') {
      ref(value);
      return;
    }

    if (ref) {
      ref.current = value;
    }
  };

  const AgGridReactMock = React.forwardRef<unknown, AgGridReactMockProps>(
    (props, ref) => {
      React.useEffect(() => {
        const instance = { api: agGridApiMock };
        assignRef(ref as MockRef, instance);
        props.onFirstDataRendered?.({ api: agGridApiMock });

        return () => {
          assignRef(ref as MockRef, null);
        };
      }, [props, ref]);

      return React.createElement('div', { 'data-testid': 'ag-grid-react' });
    }
  );
  AgGridReactMock.displayName = 'AgGridReactMock';

  return { AgGridReact: AgGridReactMock };
});

describe('DataGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    agGridApiMock.isDestroyed.mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('cancels pending default autosize frames on unmount', () => {
    const scheduledFrames = new Map<number, FrameRequestCallback>();
    const cancelAnimationFrameMock = vi.fn((frameId: number) => {
      scheduledFrames.delete(frameId);
    });
    let nextFrameId = 1;

    vi.stubGlobal('requestAnimationFrame', ((
      callback: FrameRequestCallback
    ) => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      scheduledFrames.set(frameId, callback);
      return frameId;
    }) as typeof requestAnimationFrame);
    vi.stubGlobal(
      'cancelAnimationFrame',
      cancelAnimationFrameMock as typeof cancelAnimationFrame
    );

    const { unmount } = render(
      <DataGrid columnDefs={[{ field: 'name' }]} rowData={[{ name: 'Item' }]} />
    );

    expect(scheduledFrames.size).toBe(1);

    unmount();

    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(1);
    expect(scheduledFrames.size).toBe(0);
    expect(agGridApiMock.autoSizeAllColumns).not.toHaveBeenCalled();
  });
});
