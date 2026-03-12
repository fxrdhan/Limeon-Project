import { useMemo } from 'react';
import type { MessagesPaneModel } from '../models';

export const useChatMessagesModel = (
  model: MessagesPaneModel
): MessagesPaneModel => useMemo(() => model, [model]);
