'use client';

import { useEffect, useState } from 'react';

const Hearts = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return null;
};

export default Hearts;
