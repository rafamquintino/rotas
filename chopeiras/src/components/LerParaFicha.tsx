'use client';
import { useRouter } from 'next/navigation';
import { BotaoLerPatrimonio } from './LeitorPatrimonio';

/** Botão do Estoque: lê a etiqueta e abre a ficha da chopeira. */
export function LerParaFicha() {
  const router = useRouter();
  return <BotaoLerPatrimonio onLer={(p) => router.push(`/chopeiras/patrimonio/${p}`)} className="btn-secundario px-3" rotulo="📷" />;
}
