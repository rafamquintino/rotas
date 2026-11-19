'use client';
import { useEffect, useState } from 'react';
import { EVENTO_FILA, listarPendentes, sincronizar, type ServicoPendente } from '@/lib/offline';
import { fmtData, TIPO_SERVICO } from '@/lib/format';

export default function Pendentes() {
  const [lista, setLista] = useState<ServicoPendente[]>([]);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const at = () => listarPendentes().then(setLista).catch(() => {});
    const on = () => setOnline(navigator.onLine);
    at(); on();
    window.addEventListener(EVENTO_FILA, at);
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => {
      window.removeEventListener(EVENTO_FILA, at);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
  }, []);
  return (
    <>
      <h1 className="titulo">Aguardando envio</h1>
      <p className="text-sm text-suave">Serviços registrados sem sinal ficam salvos neste aparelho e são enviados automaticamente quando a conexão volta.</p>
      {lista.length === 0 ? <div className="cartao text-center text-suave">Nada pendente. Tudo sincronizado ✓</div> : (
        <ul className="flex flex-col gap-2">
          {lista.map((s) => (
            <li key={s.id} className="cartao py-3">
              <b>{s.cliente_nome}</b>
              <div className="text-sm text-suave">{TIPO_SERVICO[s.tipo].label} · {fmtData(s.realizado_em, true)} · {s.fotos_antes.length + s.fotos_depois.length} foto(s)</div>
              {s.erro && <div className="mt-1 text-xs text-perigo">Última tentativa: {s.erro}</div>}
            </li>
          ))}
        </ul>
      )}
      {lista.length > 0 && (
        <button className="btn-primario" disabled={!online} onClick={() => sincronizar()}>
          {online ? 'Enviar agora' : 'Sem conexão'}
        </button>
      )}
    </>
  );
}
