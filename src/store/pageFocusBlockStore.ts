import { create } from 'zustand';

interface PageFocusBlockState {
  isBlocked: boolean;
  setBlocked: (isBlocked: boolean) => void;
}

export const usePageFocusBlockStore = create<PageFocusBlockState>(set => ({
  isBlocked: false,
  setBlocked: isBlocked => set({ isBlocked }),
}));

export const isPageFocusBlocked = () =>
  usePageFocusBlockStore.getState().isBlocked;
