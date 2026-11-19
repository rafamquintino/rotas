'use client';
import { useEffect } from 'react';

/** Pede ao service worker para guardar estas telas (ex.: formulários da rota do dia). */
export function GuardarOffline({ urls }: { urls: string[] }) {
  const chave = urls.join('|');
  useEffect(() => {
    if (!urls.length || !('serviceWorker' in navigator) || !navigator.onLine) return;
    navigator.serviceWorker.ready.then((r) => r.active?.postMessage({ tipo: 'precache', urls })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);
  return null;
}
