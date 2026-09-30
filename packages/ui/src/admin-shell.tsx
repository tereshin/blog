'use client';

import type { ReactNode } from 'react';
import { AppearanceFrame } from './appearance-frame';

export function AdminShell({ children }: { children: ReactNode }) {
  return <AppearanceFrame>{children}</AppearanceFrame>;
}
