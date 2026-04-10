import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { initializeSupabaseRealtimeAuthSync } from '@/lib/supabaseRealtimeAuth';
import App from './App';
import { queryClient } from '@/lib/queryClient';
import '@/fonts.css'; // AG Grid font weight customization
import '@/App.css';

// Suppress React 19 ref warning from framer-motion/motion library
// This is a known issue: https://github.com/motiondivision/motion/issues/2668
// The warning doesn't affect functionality, only appears in dev mode
if (import.meta.env.DEV) {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Accessing element.ref was removed in React 19')
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

const warmClientCaches = () => {
  void import('@/lib/queryPersistence')
    .then(({ configurePersistence }) => configurePersistence(queryClient))
    .catch(error => {
      console.warn(
        'Failed to configure persistence, continuing with in-memory cache:',
        error
      );
    });

  void import('@/utils/imageCache')
    .then(({ preloadCachedImages }) => {
      preloadCachedImages();
    })
    .catch(error => {
      console.warn('Failed to warm image cache:', error);
    });
};

const scheduleClientCacheWarmup = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const queueWarmup = () => {
    const runWarmup = () => {
      warmClientCaches();
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(runWarmup);
      return;
    }

    globalThis.setTimeout(runWarmup, 0);
  };

  const startWarmupAfterLoad = () => {
    globalThis.setTimeout(queueWarmup, 2_000);
  };

  if (document.readyState === 'complete') {
    startWarmupAfterLoad();
    return;
  }

  window.addEventListener('load', startWarmupAfterLoad, { once: true });
};

const initializeApp = () => {
  initializeSupabaseRealtimeAuthSync();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>
  );

  scheduleClientCacheWarmup();
};

initializeApp();
