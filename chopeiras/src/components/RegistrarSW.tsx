'use client';
import { useEffect } from 'react';
import { sincronizar } from '@/lib/offline';

export function RegistrarSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const tentar = () => sincronizar().catch(() => {});
    tentar();
    window.addEventListener('online', tentar);
    const t = setInterval(tentar, 60_000);
    return () => {
      window.removeEventListener('online', tentar);
      clearInterval(t);
    };
  }, []);
  return null;
}
