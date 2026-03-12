import { useMemo } from 'react';
import type { ComposerPanelModel } from '../models';

export const useChatComposerModel = (
  model: ComposerPanelModel
): ComposerPanelModel => useMemo(() => model, [model]);
