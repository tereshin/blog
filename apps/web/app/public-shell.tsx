'use client';

import { AppearanceFrame } from '@blog/ui';
import type { ReactNode } from 'react';

export function PublicShell({ children }: { children: ReactNode }) {
  return <AppearanceFrame>{children}</AppearanceFrame>;
}
