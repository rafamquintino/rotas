'use client';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { comprimirImagem, enfileirar, enviarServico, type ServicoPendente } from '@/lib/offline';
import { Assinatura } from '@/components/Assinatura';
import { CHECKLIST, TIPO_SERVICO } from '@/lib/format';
import type { TipoServico } from '@/lib/types';

interface Props {
  tecnicoId: string;
  cliente: { id: string; nome: string; cidade: string };
  chopeiras: { id: string; codigo: string }[];
  agendamento: { id: string; tipo: TipoServico; chopeira_id: string | null } | null;
}

function Fotos({ titulo, fotos, setFotos }: { titulo: string; fotos: Blob[]; setFotos: (f: Blob[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const urls = useMemo(() => fotos.map((f) => URL.createObjectURL(f)), [fotos]);
  return (
    <div>
      <div className="rotulo">{titulo}</div>
      <div className="grid grid-cols-4 gap-2">
        {urls.map((u, i) => (
          <button type="button" key={u} onClick={() => setFotos(fotos.filter((_, j) => j !== i))} className="relative" aria-label="Remover foto">
            <img src={u} alt="" className="aspect-square w-full rounded-lg object-cover" />
            <span className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white">✕</span>
          </button>
        ))}
        <button type="button" onClick={() => ref.current?.click()} className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-borda text-2xl text-suave">
          📷
        </button>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={async (e) => {
          const arquivos = [...(e.target.files ?? [])];
          const novos = await Promise.all(arquivos.map((f) => comprimirImagem(f)));
          setFotos([...fotos, ...novos]);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export function FormServico({ tecnicoId, cliente, chopeiras, agendamento }: Props) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoServico>(agendamento?.tipo ?? 'assepsia');
  const [chopeira, setChopeira] = useState<string>(agendamento?.chopeira_id ?? (chopeiras.length === 1 ? chopeiras[0].id : ''));
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  const [obs, setObs] = useState('');
  const [aceite, setAceite] = useState('');
  const [antes, setAntes] = useState<Blob[]>([]);
  const [depois, setDepois] = useState<Blob[]>([]);
  const [assinatura, setAssinatura] = useState<Blob | null>(null);
  const [estado, setEstado] = useState<'' | 'enviando' | 'erro' | 'salvo-offline'>('');
  const [msg, setMsg] = useState('');
  const itens = CHECKLIST[tipo];

  async function concluir() {
    if (itens.some((i) => !marcados[i]) && !confirm('Há itens do checklist sem marcar. Concluir assim mesmo?')) return;
    setEstado('enviando');
    const s: ServicoPendente = {
      id: crypto.randomUUID(),
      tipo,
      cliente_id: cliente.id,
      cliente_nome: cliente.nome,
      chopeira_id: chopeira || null,
      agendamento_id: agendamento && agendamento.tipo === tipo ? agendamento.id : null,
      tecnico_id: tecnicoId,
      realizado_em: new Date().toISOString(),
      checklist: itens.map((item) => ({ item, ok: !!marcados[item] })),
      observacoes: obs,
      aceite_nome: aceite,
      fotos_antes: antes,
      fotos_depois: depois,
      assinatura,
    };
    try {
      if (!navigator.onLine) throw new Error('offline');
      await enviarServico(s);
      router.push(`/clientes/${cliente.id}?ok=${encodeURIComponent('Serviço registrado. Próxima data recalculada.')}`);
      router.refresh();
    } catch {
      // Sem sinal (ou falha de rede): guarda no aparelho e sincroniza depois
      try {
        await enfileirar(s);
        setEstado('salvo-offline'); // sem sinal não dá para trocar de tela com segurança: confirma aqui mesmo
        window.scrollTo(0, 0);
      } catch (e) {
        setEstado('erro');
        setMsg('Não foi possível salvar: ' + (e as Error).message);
      }
    }
  }

  if (estado === 'salvo-offline') {
    return (
      <div className="cartao flex flex-col gap-3 text-center">
        <div className="text-5xl">📶</div>
        <h2 className="text-lg font-bold">Salvo no aparelho</h2>
        <p className="text-sm text-suave">
          Sem conexão agora. O serviço de <b>{cliente.nome}</b> será enviado sozinho quando o sinal voltar.
        </p>
        <Link href="/servico/pendentes" className="btn-secundario">Ver serviços aguardando envio</Link>
        <Link href="/agenda" className="btn-primario">Voltar à agenda</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="cartao flex flex-col gap-3">
        <div>
          <div className="text-lg font-bold">{cliente.nome}</div>
          <div className="text-sm text-suave">{cliente.cidade}</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(TIPO_SERVICO) as TipoServico[]).map((t) => (
            <button key={t} type="button" onClick={() => setTipo(t)} className={`chip justify-center text-center ${tipo === t ? 'chip-ativo' : ''}`}>
              {TIPO_SERVICO[t].curto}
            </button>
          ))}
        </div>
        {chopeiras.length > 0 && (
          <select value={chopeira} onChange={(e) => setChopeira(e.target.value)} className="campo">
            <option value="">Todas as chopeiras do cliente</option>
            {chopeiras.map((c) => <option key={c.id} value={c.id}>{c.codigo}</option>)}
          </select>
        )}
      </section>

      <section className="cartao">
        <h2 className="mb-2 font-bold">Checklist</h2>
        <ul className="flex flex-col gap-1">
          {itens.map((i) => (
            <li key={i}>
              <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg px-1">
                <input type="checkbox" checked={!!marcados[i]} onChange={(e) => setMarcados({ ...marcados, [i]: e.target.checked })} className="h-6 w-6 accent-[rgb(var(--marca))]" />
                <span>{i}</span>
              </label>
            </li>
          ))}
        </ul>
        <button type="button" className="mt-1 text-sm font-semibold text-marca" onClick={() => setMarcados(Object.fromEntries(itens.map((i) => [i, true])))}>
          Marcar todos
        </button>
      </section>

      <section className="cartao flex flex-col gap-4">
        <Fotos titulo="Fotos antes" fotos={antes} setFotos={setAntes} />
        <Fotos titulo="Fotos depois" fotos={depois} setFotos={setDepois} />
      </section>

      <section className="cartao flex flex-col gap-3">
        <div>
          <label className="rotulo">Observações</label>
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} className="campo" placeholder="Ex.: troca da borracha da torneira 2" />
        </div>
        <div>
          <label className="rotulo">Aceite do cliente – nome (opcional)</label>
          <input value={aceite} onChange={(e) => setAceite(e.target.value)} className="campo" placeholder="Quem acompanhou o serviço" />
        </div>
        <Assinatura onChange={setAssinatura} />
      </section>

      {estado === 'erro' && <p className="rounded-xl bg-perigo/15 p-3 text-sm text-perigo">{msg}</p>}
      <button type="button" onClick={concluir} disabled={estado === 'enviando'} className="btn-ok sticky bottom-20 text-lg shadow-lg">
        {estado === 'enviando' ? 'Salvando…' : '✓ Concluir serviço'}
      </button>
    </div>
  );
}
