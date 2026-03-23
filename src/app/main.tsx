import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { configurePersistence } from '@/lib/queryPersistence';
import { queryClient } from '@/lib/queryClient';
import { preloadCachedImages } from '@/utils/imageCache';
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

// Configure custom IndexedDB persistence (works in both dev and production)
const initializeApp = async () => {
  try {
    await configurePersistence(queryClient);
  } catch (error) {
    console.warn(
      'Failed to configure persistence, continuing with in-memory cache:',
      error
    );
  }

  preloadCachedImages();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>
  );
};

void initializeApp();
