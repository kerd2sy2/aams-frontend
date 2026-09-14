'use client';

import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

import { DEFAULT_THEME, THEMES } from './theme.config';

const COOKIE_NAME = 'active_theme';

function setThemeCookie(theme: string) {
  if (typeof window === 'undefined') return;

  document.cookie = `${COOKIE_NAME}=${theme}; path=/; max-age=31536000; SameSite=Lax; ${window.location.protocol === 'https:' ? 'Secure;' : ''}`;
}

type ThemeContextType = {
  activeTheme: string;
  setActiveTheme: (theme: string) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ActiveThemeProvider({
  children,
  initialTheme
}: {
  children: ReactNode;
  initialTheme?: string;
}) {
  const themeToUse = initialTheme || DEFAULT_THEME;
  const [activeTheme, setActiveTheme] = useState<string>(themeToUse);

  useEffect(() => {
    // Only update if theme has changed
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme !== activeTheme) {
      setThemeCookie(activeTheme);

      // Remove existing data-theme attribute
      document.documentElement.removeAttribute('data-theme');

      // Remove any theme classes from body (cleanup)
      Array.from(document.body.classList)
        .filter((className) => className.startsWith('theme-'))
        .forEach((className) => {
          document.body.classList.remove(className);
        });

      // Set data-theme on html element
      if (activeTheme) {
        document.documentElement.setAttribute('data-theme', activeTheme);
      }
    } else {
      // Still update cookie in case it's missing
      setThemeCookie(activeTheme);
    }
  }, [activeTheme]);

  // Global shortcut: pressing 'tt' or 'فف' cycles the theme
  useEffect(() => {
    let lastKey = '';
    let lastTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable ||
        target?.getAttribute?.('role') === 'textbox'
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key ? e.key.toLowerCase() : '';
      const now = Date.now();

      if (key === 't' || key === 'ف') {
        if (lastKey === key && now - lastTime < 600) {
          e.preventDefault();
          lastKey = '';
          lastTime = 0;

          setActiveTheme((prev) => {
            const currentIndex = THEMES.findIndex((item) => item.value === prev);
            const nextIndex = (currentIndex + 1) % THEMES.length;
            return THEMES[nextIndex].value;
          });
        } else {
          lastKey = key;
          lastTime = now;
        }
      } else {
        lastKey = '';
        lastTime = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ThemeContext.Provider value={{ activeTheme, setActiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeConfig() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeConfig must be used within an ActiveThemeProvider');
  }
  return context;
}
