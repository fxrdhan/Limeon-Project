import { useState, useEffect } from 'react';

export const useTableHeight = (offset: number = 200) => {
  const [tableHeight, setTableHeight] = useState<string>('600px');

  useEffect(() => {
    const calculateHeight = () => {
      const viewportHeight = window.innerHeight;
      const dynamicHeight = viewportHeight - offset;
      setTableHeight(`${Math.max(dynamicHeight, 300)}px`);
    };

    calculateHeight();
    window.addEventListener('resize', calculateHeight);

    return () => {
      window.removeEventListener('resize', calculateHeight);
    };
  }, [offset]);

  return tableHeight;
};
