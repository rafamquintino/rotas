'use client';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Barra fina no topo enquanto a próxima tela carrega (retorno imediato ao toque no 4G).
 * Substitui o loading.tsx, que no Next 15 impedia a tela de atualizar depois de uma ação
 * que volta para a mesma página (ex.: "Salvar observações").
 */
export function BarraCarregando() {
  const path = usePathname();
  const busca = useSearchParams();
  const [ativa, setAtiva] = useState(false);

  useEffect(() => setAtiva(false), [path, busca]);

  useEffect(() => {
    const clique = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as HTMLElement).closest('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setAtiva(true);
    };
    const envio = () => setAtiva(true);
    document.addEventListener('click', clique, true);
    document.addEventListener('submit', envio, true);
    return () => {
      document.removeEventListener('click', clique, true);
      document.removeEventListener('submit', envio, true);
    };
  }, []);

  useEffect(() => {
    if (!ativa) return;
    const t = setTimeout(() => setAtiva(false), 15000); // nunca fica presa
    return () => clearTimeout(t);
  }, [ativa]);

  if (!ativa) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-cevada/30" role="progressbar" aria-label="Carregando">
      <div className="h-full w-1/3 animate-[barra_1s_ease-in-out_infinite] bg-cevada" />
    </div>
  );
}
