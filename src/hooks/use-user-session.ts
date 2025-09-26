'use client';

import { useContext } from 'react';
import { UserContext, User } from '@/app/providers';

const useUserSession = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserSession must be used within a UserProvider');
  }

  const { user, setUser: setContextUser, isLoaded } = context;

  const setUser = (newUser: User | null) => {
    if (typeof window !== 'undefined') {
      if (newUser) {
        localStorage.setItem('user', JSON.stringify(newUser));
      } else {
        localStorage.removeItem('user');
      }
    }
    setContextUser(newUser);
  };

  return { user, setUser, isLoaded };
};

export default useUserSession;
