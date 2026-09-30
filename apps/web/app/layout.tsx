import { theme_boot_script } from '@blog/ui';
import type { ReactNode } from 'react';
import { PublicShell } from './public-shell';
import './globals.css';

export const metadata = {
  title: 'blog',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <script dangerouslySetInnerHTML={{ __html: theme_boot_script }} />
        <PublicShell>{children}</PublicShell>
      </body>
    </html>
  );
}
