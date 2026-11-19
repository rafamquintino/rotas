'use client';
import { useEffect, useState } from 'react';

export function AlternarTema() {
  const [tema, setTema] = useState<'light' | 'dark'>('light');
  useEffect(() => setTema((document.documentElement.dataset.theme as 'light' | 'dark') ?? 'light'), []);
  const trocar = () => {
    const t = tema === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('tema', t); } catch {}
    setTema(t);
  };
  return (
    <button onClick={trocar} className="btn-secundario w-full justify-start">
      {tema === 'dark' ? '☀️ Modo claro' : '🌙 Modo escuro'}
    </button>
  );
}
