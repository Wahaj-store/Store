'use client';

import type { ReactNode } from 'react';
import { useFeatureFlags } from '@/lib/use-feature-flags';

export default function FeatureFlagGate({
  flag,
  children,
}: {
  flag: string;
  children: ReactNode;
}) {
  const { enabled, loaded } = useFeatureFlags();
  if (!loaded || !enabled(flag, false)) return null;
  return <>{children}</>;
}
