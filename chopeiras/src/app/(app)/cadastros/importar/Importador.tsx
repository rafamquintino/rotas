'use client';
import { useState } from 'react';
import Papa from 'papaparse';
import { importarCsv, type ResultadoImport } from '../actions';

const MODELOS = {
  chopeiras: 'patrimonio;numero_serie;marca;voltagem;vias;modelo;capacidade_lph;condicao;observacoes\n0878;SN123;Gorillaz;220V;2;Gorillaz Pro 2V;100;boa;\n;SN124;Gonçalves;110V;1;;;regular;sem etiqueta ainda',
  clientes: 'nome;cidade;endereco;contato;telefone;tipo;vendedor_email;freq_assepsia_dias;freq_manutencao_dias\nBar Exemplo;Poços de Caldas;Rua A, 10;João;35999999999;bar;vendedor@exemplo.com;15;90',
  usuarios: 'nome;email;senha;perfil;telefone;cidades\nMaria Silva;maria@exemplo.com;trocar123;vendedor;35999999999;Poços de Caldas, Andradas',
};
type Tipo = keyof typeof MODELOS;

export function Importador() {
  const [tipo, setTipo] = useState<Tipo>('chopeiras');
  const [linhas, setLinhas] = useState<Record<string, string>[]>([]);
  const [res, setRes] = useState<ResultadoImport | null>(null);
  const [enviando, setEnviando] = useState(false);

  const baixarModelo = () => {
    const url = URL.createObjectURL(new Blob(['﻿' + MODELOS[tipo]], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: `modelo-${tipo}.csv` }).click();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(MODELOS) as Tipo[]).map((t) => (
          <button key={t} onClick={() => { setTipo(t); setLinhas([]); setRes(null); }} className={`chip justify-center capitalize ${tipo === t ? 'chip-ativo' : ''}`}>{t}</button>
        ))}
      </div>
      <div className="cartao flex flex-col gap-3">
        <p className="text-sm text-suave">Use CSV separado por ponto e vírgula ou vírgula, com cabeçalho na primeira linha.</p>
        <button className="btn-secundario" onClick={baixarModelo}>Baixar planilha modelo</button>
        <input
          type="file"
          accept=".csv,text/csv"
          className="campo py-3"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setRes(null);
            Papa.parse<Record<string, string>>(f, { header: true, skipEmptyLines: true, complete: (r) => setLinhas(r.data) });
          }}
        />
      </div>
      {linhas.length > 0 && (
        <div className="cartao">
          <h2 className="mb-2 font-bold">{linhas.length} linha(s) encontradas</h2>
          <div className="scroll-x">
            <table className="tabela">
              <thead><tr>{Object.keys(linhas[0]).map((k) => <th key={k}>{k}</th>)}</tr></thead>
              <tbody>{linhas.slice(0, 5).map((l, i) => <tr key={i}>{Object.values(l).map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <button
            className="btn-primario mt-3 w-full"
            disabled={enviando}
            onClick={async () => {
              setEnviando(true);
              setRes(await importarCsv(tipo, linhas).catch((e) => ({ ok: 0, erros: [String(e.message ?? e)] })));
              setEnviando(false);
            }}
          >
            {enviando ? 'Importando…' : `Importar ${linhas.length} ${tipo}`}
          </button>
        </div>
      )}
      {res && (
        <div className="cartao">
          <p className="font-bold text-ok">{res.ok} importado(s)</p>
          {res.erros.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm text-perigo">{res.erros.map((e) => <li key={e}>{e}</li>)}</ul>
          )}
        </div>
      )}
    </div>
  );
}
