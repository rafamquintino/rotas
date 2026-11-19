'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EVENTO_FILA, listarPendentes, sincronizar } from '@/lib/offline';

/** Selo no topo: offline e serviços aguardando envio. */
export function StatusConexao() {
  const [online, setOnline] = useState(true);
  const [pendentes, setPendentes] = useState(0);

  useEffect(() => {
    const atualizar = () => listarPendentes().then((l) => setPendentes(l.length)).catch(() => {});
    const on = () => setOnline(navigator.onLine);
    on();
    atualizar();
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    window.addEventListener(EVENTO_FILA, atualizar);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
      window.removeEventListener(EVENTO_FILA, atualizar);
    };
  }, []);

  if (online && !pendentes) return null;
  return (
    <div className={`flex items-center justify-between gap-2 px-4 py-2 text-sm font-medium ${online ? 'bg-alerta/15 text-alerta' : 'bg-perigo/15 text-perigo'}`}>
      <span>
        {online ? '' : 'Sem sinal · '}
        {pendentes > 0 ? `${pendentes} serviço(s) aguardando envio` : 'você está offline'}
      </span>
      {online && pendentes > 0 ? (
        <button className="underline" onClick={() => sincronizar()}>Enviar agora</button>
      ) : (
        <Link href="/servico/pendentes" className="underline">Ver</Link>
      )}
    </div>
  );
}
