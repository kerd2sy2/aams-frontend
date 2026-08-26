'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useLocale } from './locale-provider';

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant='ghost' size='icon' className='size-8' aria-label='Language' />
        }
      >
        <Icons.language className='size-4' />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={() => setLocale('en')}>
          English
          {locale === 'en' && <Icons.check className='ms-auto size-4' />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocale('ar')}>
          العربية
          {locale === 'ar' && <Icons.check className='ms-auto size-4' />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
