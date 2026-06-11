export const runTasksWithConcurrency = async <T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>
) => {
  const boundedLimit = Math.max(1, limit);
  const taskQueue = [...items];

  await Promise.all(
    Array.from({
      length: Math.min(boundedLimit, taskQueue.length),
    }).map(async () => {
      while (taskQueue.length > 0) {
        const nextItem = taskQueue.shift();
        if (!nextItem) {
          return;
        }

        await task(nextItem);
      }
    })
  );
};
