'use client';
import { useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { comprimirImagem } from '@/lib/offline';
import { MAX_FOTOS } from '@/lib/format';

/** Até 5 fotos no cadastro: comprime no aparelho, envia ao Storage e grava os caminhos em campos ocultos "fotos". */
export function FotosCadastro() {
  const pasta = useMemo(() => `chopeiras/cadastro/${crypto.randomUUID()}`, []);
  const ref = useRef<HTMLInputElement>(null);
  const [fotos, setFotos] = useState<{ caminho: string; url: string }[]>([]);
  const [enviando, setEnviando] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const restam = MAX_FOTOS - fotos.length - enviando;

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = [...(e.target.files ?? [])].slice(0, restam);
    e.target.value = '';
    if (!arquivos.length) return;
    setErro(null);
    setEnviando((n) => n + arquivos.length);
    await Promise.all(arquivos.map(async (f) => {
      try {
        const blob = await comprimirImagem(f);
        const caminho = `${pasta}/${crypto.randomUUID()}.jpg`;
        const { error } = await createClient().storage.from('fotos').upload(caminho, blob, { contentType: 'image/jpeg' });
        if (error) throw error;
        setFotos((l) => (l.length < MAX_FOTOS ? [...l, { caminho, url: URL.createObjectURL(blob) }] : l));
      } catch (err) {
        setErro('Uma foto não foi enviada: ' + (err as Error).message);
      } finally {
        setEnviando((n) => n - 1);
      }
    }));
  }

  return (
    <div>
      <div className="rotulo">Fotos da chopeira ({fotos.length}/{MAX_FOTOS}) – para reconhecer e registrar o estado</div>
      <div className="grid grid-cols-5 gap-2">
        {fotos.map((f) => (
          <button type="button" key={f.caminho} className="relative" aria-label="Remover foto"
            onClick={() => setFotos((l) => l.filter((x) => x.caminho !== f.caminho))}>
            <img src={f.url} alt="" className="aspect-square w-full rounded-lg object-cover" />
            <span className="absolute right-0.5 top-0.5 rounded-full bg-black/60 px-1 text-[10px] text-white">✕</span>
            <input type="hidden" name="fotos" value={f.caminho} />
          </button>
        ))}
        {Array.from({ length: enviando }).map((_, i) => (
          <div key={'e' + i} className="flex aspect-square animate-pulse items-center justify-center rounded-lg bg-borda text-xs text-suave">…</div>
        ))}
        {restam > 0 && (
          <button type="button" onClick={() => ref.current?.click()}
            className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-borda text-xl text-suave" aria-label="Adicionar foto">
            📷
          </button>
        )}
      </div>
      {enviando > 0 && <p className="mt-1 text-xs text-suave">Enviando foto(s)… aguarde antes de salvar.</p>}
      {erro && <p className="mt-1 text-xs text-perigo">{erro}</p>}
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={escolher} />
    </div>
  );
}
