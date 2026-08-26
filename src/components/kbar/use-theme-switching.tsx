import { useRegisterActions } from 'kbar';
import { useTheme } from 'next-themes';
import { useThemeConfig } from '@/components/themes/active-theme';
import { THEMES } from '@/components/themes/theme.config';
import { useRouter } from 'next/navigation';

const useThemeSwitching = () => {
  const { theme, setTheme } = useTheme();
  const { activeTheme, setActiveTheme } = useThemeConfig();
  const router = useRouter();

  const toggleDarkLight = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const cycleTheme = () => {
    const currentIndex = THEMES.findIndex((t) => t.value === activeTheme);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    setActiveTheme(THEMES[nextIndex].value);
  };

  const themeActions = [
    {
      id: 'cycleTheme',
      name: 'Switch Theme',
      shortcut: ['t', 't'],
      section: 'Theme',
      perform: cycleTheme
    },
    {
      id: 'cycleThemeAr',
      name: 'Switch Theme (Ar)',
      shortcut: ['ف', 'ف'],
      section: 'Theme',
      perform: cycleTheme
    },
    {
      id: 'toggleDarkLight',
      name: 'Toggle Dark/Light Mode',
      shortcut: ['d', 'd'],
      section: 'Theme',
      perform: toggleDarkLight
    },
    {
      id: 'toggleDarkLightAr',
      name: 'Toggle Dark/Light Mode (Ar)',
      shortcut: ['ي', 'ي'],
      section: 'Theme',
      perform: toggleDarkLight
    },
    {
      id: 'setLightTheme',
      name: 'Set Light Theme',
      section: 'Theme',
      perform: () => setTheme('light')
    },
    {
      id: 'setDarkTheme',
      name: 'Set Dark Theme',
      section: 'Theme',
      perform: () => setTheme('dark')
    },
    {
      id: 'startWork',
      name: 'Start Work (بدء الدوام)',
      shortcut: ['s', 's'],
      section: 'Work',
      perform: () => router.push('/dashboard/work/start')
    },
    {
      id: 'startWorkAr',
      name: 'بدء الدوام',
      shortcut: ['س', 'س'],
      section: 'Work',
      perform: () => router.push('/dashboard/work/start')
    },
    {
      id: 'endWork',
      name: 'End Work (انهاء الدوام)',
      shortcut: ['e', 'e'],
      section: 'Work',
      perform: () => router.push('/dashboard/work/end')
    },
    {
      id: 'endWorkAr',
      name: 'انهاء الدوام',
      shortcut: ['ث', 'ث'],
      section: 'Work',
      perform: () => router.push('/dashboard/work/end')
    }
  ];

  useRegisterActions(themeActions, [theme, activeTheme, router]);
};

export default useThemeSwitching;
