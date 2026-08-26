'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();
  const [dir, setDir] = React.useState<'rtl' | 'ltr'>('rtl');

  React.useEffect(() => {
    const updateDir = () => {
      const isRtl =
        document.documentElement.dir === 'rtl' || document.documentElement.lang === 'ar';
      setDir(isRtl ? 'rtl' : 'ltr');
    };
    updateDir();

    const observer = new MutationObserver(updateDir);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir', 'lang']
    });
    return () => observer.disconnect();
  }, []);

  const position = dir === 'rtl' ? 'bottom-left' : 'bottom-right';

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className='toaster group'
      dir={dir}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)'
        } as React.CSSProperties
      }
      position={position}
      {...props}
    />
  );
};

export { Toaster };
