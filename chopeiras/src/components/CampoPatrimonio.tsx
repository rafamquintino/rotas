'use client';
import { useState } from 'react';
import { BotaoLerPatrimonio } from './LeitorPatrimonio';

/** Campo de patrimônio (4 números, opcional) com leitura pela câmera. */
export function CampoPatrimonio({ valor }: { valor?: string | null }) {
  const [v, setV] = useState(valor ?? '');
  return (
    <div>
      <label className="rotulo" htmlFor="patrimonio">Patrimônio (4 números, opcional)</label>
      <div className="flex gap-2">
        <input
          id="patrimonio"
          name="patrimonio"
          value={v}
          onChange={(e) => setV(e.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric"
          pattern="\d{4}"
          placeholder="Ex.: 0878 · vazio se ainda não tem etiqueta"
          className="campo tracking-widest"
        />
        <BotaoLerPatrimonio onLer={setV} rotulo="📷" className="btn-secundario px-4" />
      </div>
    </div>
  );
}
