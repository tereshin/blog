'use client';

import { translate, type Locale } from '@blog/i18n';
import { shell_catalog } from '@blog/i18n/features/shell';
import { Button } from '@heroui/react';
import { ThemeProvider, useTheme } from 'next-themes';
import { useEffect, useState, type ReactNode } from 'react';
import { locale_storage_key, theme_storage_key } from './theme-boot';

const theme_values = ['light', 'dark', 'system'] as const;
const locale_values: Locale[] = ['en', 'sr-Latn', 'ru'];

function isLocale(value: string | null): value is Locale {
  return value === 'en' || value === 'sr-Latn' || value === 'ru';
}

function AppearanceControls({
  children,
  on_locale,
}: {
  children: ReactNode;
  on_locale?: (locale: Locale) => void;
}) {
  const { setTheme, theme } = useTheme();
  const [locale, set_locale] = useState<Locale>('en');
  const [mounted, set_mounted] = useState(false);
  const active_theme = mounted && theme ? theme : 'system';

  useEffect(() => {
    set_mounted(true);
  }, []);

  useEffect(() => {
    const stored_locale = localStorage.getItem(locale_storage_key);

    if (isLocale(stored_locale)) {
      set_locale(stored_locale);
      on_locale?.(stored_locale);
    }
  }, [on_locale]);

  useEffect(() => {
    if (!mounted || !theme) {
      return;
    }

    const resolved_theme =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;

    document.documentElement.setAttribute('data-theme', resolved_theme);
  }, [mounted, theme]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function chooseLocale(next_locale: Locale): void {
    set_locale(next_locale);
    localStorage.setItem(locale_storage_key, next_locale);
    on_locale?.(next_locale);
  }

  return (
    <div className="bg-background text-foreground">
      <div>
        {theme_values.map((value) => (
          <Button
            key={value}
            aria-pressed={active_theme === value}
            variant={active_theme === value ? 'primary' : 'secondary'}
            onPress={() => setTheme(value)}
          >
            {translate(locale, `shell.theme.${value}`, shell_catalog)}
          </Button>
        ))}
        {locale_values.map((value) => (
          <Button
            key={value}
            aria-pressed={locale === value}
            variant={locale === value ? 'primary' : 'secondary'}
            onPress={() => chooseLocale(value)}
          >
            {translate(locale, `shell.language.${value}`, shell_catalog)}
          </Button>
        ))}
      </div>
      <p>{translate(locale, 'shell.greeting', shell_catalog)}</p>
      <p>{translate(locale, 'shell.english_only', shell_catalog)}</p>
      {children}
    </div>
  );
}

export function AppearanceFrame({
  children,
  on_locale,
}: {
  children: ReactNode;
  on_locale?: (locale: Locale) => void;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey={theme_storage_key}
    >
      <AppearanceControls on_locale={on_locale}>{children}</AppearanceControls>
    </ThemeProvider>
  );
}
