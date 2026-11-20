import Link from 'next/link';

const CORES: Record<string, string> = {
  ok: 'bg-ok/15 text-ok',
  info: 'bg-info/15 text-info',
  alerta: 'bg-alerta/15 text-alerta',
  perigo: 'bg-perigo/15 text-perigo',
  marca: 'bg-marca/15 text-marca-forte',
  suave: 'bg-suave/15 text-suave',
  roxo: 'bg-roxo/15 text-roxo',
  ciano: 'bg-ciano/15 text-ciano',
};

export function Selo({ cor = 'suave', children }: { cor?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${CORES[cor] ?? CORES.suave}`}>
      {children}
    </span>
  );
}

export function Flash({ ok, erro }: { ok?: string; erro?: string }) {
  if (!ok && !erro) return null;
  return (
    <div role="status" className={`rounded-xl px-4 py-3 text-sm font-medium ${erro ? 'bg-perigo/15 text-perigo' : 'bg-ok/15 text-ok'}`}>
      {erro ?? ok}
    </div>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <div className="cartao text-center text-suave">{children}</div>;
}

export function Cabecalho({ titulo, voltar, acao }: { titulo: string; voltar?: string; acao?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {voltar && (
        <Link href={voltar} aria-label="Voltar" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-2xl hover:bg-superficie">
          ‹
        </Link>
      )}
      <h1 className="titulo flex-1 truncate">{titulo}</h1>
      {acao}
    </div>
  );
}

type Opcao = { valor: string; label: string };
/** Filtro em chips horizontais (links, funciona sem JS). */
export function Chips({ nome, opcoes, params, base }: { nome: string; opcoes: Opcao[]; params: Record<string, string | undefined>; base: string }) {
  const atual = params[nome] ?? '';
  const href = (valor: string) => {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && k !== nome && k !== 'ok' && k !== 'erro' && p.set(k, v));
    if (valor) p.set(nome, valor);
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  };
  return (
    <div className="scroll-x -mx-4 flex gap-2 px-4">
      {[{ valor: '', label: 'Todos' }, ...opcoes].map((o) => (
        <Link key={o.valor} href={href(o.valor)} className={`chip ${atual === o.valor ? 'chip-ativo' : ''}`} scroll={false}>
          {o.label}
        </Link>
      ))}
    </div>
  );
}

export function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-borda/60 py-2 text-sm last:border-0">
      <span className="text-suave">{rotulo}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}
