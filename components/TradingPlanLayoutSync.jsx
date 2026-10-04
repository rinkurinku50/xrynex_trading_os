'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const layoutSavedKey = 'xrynex-trading-plan-layout-saved';

export default function TradingPlanLayoutSync() {
  const router = useRouter();

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === layoutSavedKey) router.refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [router]);

  return null;
}