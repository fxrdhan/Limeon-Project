import { PDF_PREVIEW_BACKGROUND_CONCURRENCY } from './constants';

export const runConcurrentPdfPreviewTasks = async <T>(
  items: T[],
  worker: (item: T) => Promise<void>
) => {
  let currentIndex = 0;
  const workerCount = Math.min(
    PDF_PREVIEW_BACKGROUND_CONCURRENCY,
    items.length
  );

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (currentIndex < items.length) {
        const item = items[currentIndex];
        currentIndex += 1;

        if (!item) {
          return;
        }

        await worker(item);
      }
    })
  );
};
