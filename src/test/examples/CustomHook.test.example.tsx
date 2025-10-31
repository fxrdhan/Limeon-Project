/**
 * Example Hook Test - Custom React Hook
 *
 * This example demonstrates testing patterns for custom React hooks.
 * Use this as a reference for testing stateful logic.
 */

import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';

// Example custom hook
interface UseCounterOptions {
  initialValue?: number;
  min?: number;
  max?: number;
  step?: number;
}

function useCounter(options: UseCounterOptions = {}) {
  const {
    initialValue = 0,
    min = -Infinity,
    max = Infinity,
    step = 1,
  } = options;

  const [count, setCount] = React.useState(initialValue);

  const increment = () => setCount(prev => Math.min(max, prev + step));

  const decrement = () => setCount(prev => Math.max(min, prev - step));

  const reset = () => setCount(initialValue);

  const set = (value: number) => {
    const clamped = Math.max(min, Math.min(max, value));
    setCount(clamped);
  };

  return { count, increment, decrement, reset, set };
}

describe('useCounter Hook', () => {
  describe('Initial State', () => {
    it('should initialize with default value', () => {
      const { result } = renderHook(() => useCounter());

      expect(result.current.count).toBe(0);
    });

    it('should initialize with custom value', () => {
      const { result } = renderHook(() => useCounter({ initialValue: 10 }));

      expect(result.current.count).toBe(10);
    });
  });

  describe('Increment', () => {
    it('should increment by default step', () => {
      const { result } = renderHook(() => useCounter());

      act(() => {
        result.current.increment();
      });

      expect(result.current.count).toBe(1);
    });

    it('should increment by custom step', () => {
      const { result } = renderHook(() => useCounter({ step: 5 }));

      act(() => {
        result.current.increment();
      });

      expect(result.current.count).toBe(5);
    });

    it('should not exceed maximum', () => {
      const { result } = renderHook(() => useCounter({ max: 10 }));

      act(() => {
        result.current.set(10);
        result.current.increment();
      });

      expect(result.current.count).toBe(10);
    });
  });

  describe('Decrement', () => {
    it('should decrement by default step', () => {
      const { result } = renderHook(() => useCounter({ initialValue: 5 }));

      act(() => {
        result.current.decrement();
      });

      expect(result.current.count).toBe(4);
    });

    it('should not go below minimum', () => {
      const { result } = renderHook(() => useCounter({ min: 0 }));

      act(() => {
        result.current.decrement();
      });

      expect(result.current.count).toBe(0);
    });
  });

  describe('Reset', () => {
    it('should reset to initial value', () => {
      const { result } = renderHook(() => useCounter({ initialValue: 10 }));

      act(() => {
        result.current.increment();
        result.current.increment();
      });

      expect(result.current.count).toBe(12);

      act(() => {
        result.current.reset();
      });

      expect(result.current.count).toBe(10);
    });
  });

  describe('Set', () => {
    it('should set to specific value', () => {
      const { result } = renderHook(() => useCounter());

      act(() => {
        result.current.set(42);
      });

      expect(result.current.count).toBe(42);
    });

    it('should clamp value to min', () => {
      const { result } = renderHook(() => useCounter({ min: 0 }));

      act(() => {
        result.current.set(-10);
      });

      expect(result.current.count).toBe(0);
    });

    it('should clamp value to max', () => {
      const { result } = renderHook(() => useCounter({ max: 100 }));

      act(() => {
        result.current.set(200);
      });

      expect(result.current.count).toBe(100);
    });
  });
});

// Example data fetching hook
interface Item {
  id: string;
  name: string;
}

function useFetchItems() {
  const [items, setItems] = React.useState<Item[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/items');
      const data = await response.json();
      setItems(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchItems();
  }, []);

  return { items, loading, error, refetch: fetchItems };
}

describe('useFetchItems Hook', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch items on mount', async () => {
    const mockItems = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ];

    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => mockItems,
    } as Response);

    const { result } = renderHook(() => useFetchItems());

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.items).toEqual([]);

    // Wait for fetch to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toEqual(mockItems);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch errors', async () => {
    const mockError = new Error('Network error');

    vi.mocked(fetch).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useFetchItems());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.items).toEqual([]);
  });

  it('should refetch when refetch is called', async () => {
    const mockItems1 = [{ id: '1', name: 'Item 1' }];
    const mockItems2 = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ];

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: async () => mockItems1,
      } as Response)
      .mockResolvedValueOnce({
        json: async () => mockItems2,
      } as Response);

    const { result } = renderHook(() => useFetchItems());

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.items).toEqual(mockItems1);
    });

    // Refetch
    act(() => {
      result.current.refetch();
    });

    // Wait for refetch to complete
    await waitFor(() => {
      expect(result.current.items).toEqual(mockItems2);
    });

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

// Example hook with React Query
function useItemsQuery() {
  return useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const response = await fetch('/api/items');
      return response.json();
    },
  });
}

describe('useItemsQuery Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should fetch items successfully', async () => {
    const mockItems = [{ id: '1', name: 'Item 1' }];

    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => mockItems,
    } as Response);

    const { result } = renderHook(() => useItemsQuery(), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for query to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockItems);
  });

  it('should handle query errors', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useItemsQuery(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('should refetch when invalidated', async () => {
    const mockItems1 = [{ id: '1', name: 'Item 1' }];
    const mockItems2 = [{ id: '2', name: 'Item 2' }];

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: async () => mockItems1,
      } as Response)
      .mockResolvedValueOnce({
        json: async () => mockItems2,
      } as Response);

    const { result } = renderHook(() => useItemsQuery(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockItems1);
    });

    // Invalidate and refetch
    act(() => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockItems2);
    });
  });
});
