'use client';

import { useContext } from 'react';
import { UserContext, User } from '@/app/providers';

const useUserSession = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserSession must be used within a UserProvider');
  }

  return context;
};

export default useUserSession;
