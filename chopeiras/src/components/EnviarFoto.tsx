'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { comprimirImagem } from '@/lib/offline';

/** Tira/escolhe foto, comprime no aparelho e envia ao Storage; depois chama onEnviada(caminho). */
export function EnviarFoto({ pasta, onEnviada, rotulo = '📷 Adicionar foto' }: { pasta: string; onEnviada: (caminho: string) => Promise<{ erro?: string } | unknown>; rotulo?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<string | null>(null);
  const router = useRouter();

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setEstado('Enviando…');
    try {
      const blob = await comprimirImagem(f);
      const caminho = `${pasta}/${Date.now()}.jpg`;
      const { error } = await createClient().storage.from('fotos').upload(caminho, blob, { contentType: 'image/jpeg' });
      if (error) throw error;
      const r = (await onEnviada(caminho)) as { erro?: string } | undefined;
      if (r?.erro) throw new Error(r.erro);
      setEstado(null);
      router.refresh();
    } catch (err) {
      setEstado('Falha: ' + (err as Error).message);
    } finally {
      if (ref.current) ref.current.value = '';
    }
  }

  return (
    <div>
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={escolher} />
      <button type="button" className="btn-secundario w-full" onClick={() => ref.current?.click()} disabled={estado === 'Enviando…'}>
        {estado === 'Enviando…' ? 'Enviando…' : rotulo}
      </button>
      {estado && estado !== 'Enviando…' && <p className="mt-1 text-sm text-perigo">{estado}</p>}
    </div>
  );
}
