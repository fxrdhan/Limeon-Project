import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { MasterDataType } from '@/features/item-management/shared/types';
import {
  getMasterDataPathForTab,
  getMasterDataTabFromUrlSegment,
} from '../config';
import { getLastTabFromSession, saveLastTabToSession } from '../sessionState';

export const useItemMasterRouting = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = useCallback((pathname: string): MasterDataType => {
    const normalizedPath = pathname.replace(/\/+$/, '');
    if (normalizedPath === '/master-data/item-master') {
      return getLastTabFromSession();
    }
    const pathSegments = normalizedPath.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    return getMasterDataTabFromUrlSegment(lastSegment) || 'items';
  }, []);

  const activeTab = useMemo(
    () => getTabFromPath(location.pathname),
    [getTabFromPath, location.pathname]
  );

  useEffect(() => {
    const normalizedPath = location.pathname.replace(/\/+$/, '');
    if (normalizedPath !== '/master-data/item-master') return;

    const lastTab = getLastTabFromSession();
    void navigate(getMasterDataPathForTab(lastTab), { replace: true });
  }, [location.pathname, navigate]);

  useEffect(() => {
    saveLastTabToSession(activeTab);
  }, [activeTab]);

  return { activeTab, navigate };
};
