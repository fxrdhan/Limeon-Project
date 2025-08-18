import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { configurePersistence } from './lib/queryPersistence';
import './output.css';

// Create QueryClient with optimized pharmacy data caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Smart cache defaults for pharmacy data
      staleTime: 5 * 60 * 1000, // 5 minutes fresh
      gcTime: 10 * 60 * 1000, // 10 minutes in memory
      retry: 2,
      refetchOnWindowFocus: false, // Reduce unnecessary refetches
    },
  },
});

// Configure custom IndexedDB persistence (works in both dev and production)
configurePersistence(queryClient);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      {/* Only load DevTools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  </StrictMode>
);
