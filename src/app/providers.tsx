'use client';

import { createContext, useState, useEffect, ReactNode, Dispatch, SetStateAction } from 'react';

// --- Theme Provider ---
type Theme = 'dark' | 'light' | 'romantic';
type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>('romantic');

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      setThemeState(storedTheme);
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.remove('light', 'dark', 'romantic');
    if (newTheme !== 'romantic') {
      document.documentElement.classList.add(newTheme);
    }
  };
  
  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// --- User Provider ---
export type User = {
  name: string;
};
type UserContextType = {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  isLoaded: boolean;
};
export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to parse user from localStorage', error);
      localStorage.removeItem('user');
    }
    setIsLoaded(true);
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, isLoaded }}>
      {children}
    </UserContext.Provider>
  );
};


// --- App Providers ---
export const AppProviders = ({ children }: { children: ReactNode }) => {
  return (
    <ThemeProvider>
      <UserProvider>
        {children}
      </UserProvider>
    </ThemeProvider>
  );
};