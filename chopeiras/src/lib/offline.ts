'use client';
/**
 * Fila offline do técnico: serviços registrados sem sinal ficam no IndexedDB
 * (com as fotos em Blob) e são enviados quando a conexão volta.
 * O id do serviço é gerado no aparelho, então reenviar não duplica.
 */
import { createClient } from './supabase/client';
import type { TipoServico } from './types';

export interface ServicoPendente {
  id: string;
  tipo: TipoServico;
  cliente_id: string;
  cliente_nome: string;
  chopeira_id: string | null;
  agendamento_id: string | null;
  tecnico_id: string;
  realizado_em: string;
  checklist: { item: string; ok: boolean }[];
  observacoes: string;
  aceite_nome: string;
  fotos_antes: Blob[];
  fotos_depois: Blob[];
  assinatura: Blob | null;
  erro?: string;
}

const DB = 'chopeiras-offline';
const STORE = 'servicos';
export const EVENTO_FILA = 'fila-offline-mudou';

function abrir(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function tx<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, modo);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => res(req.result);
    t.onerror = () => rej(t.error);
  });
}

const avisar = () => window.dispatchEvent(new Event(EVENTO_FILA));

export async function enfileirar(s: ServicoPendente) {
  await tx('readwrite', (st) => st.put(s));
  avisar();
}
export const listarPendentes = () => tx<ServicoPendente[]>('readonly', (st) => st.getAll());
const remover = async (id: string) => { await tx('readwrite', (st) => st.delete(id)); avisar(); };

async function subir(blob: Blob, caminho: string) {
  const sb = createClient();
  const { error } = await sb.storage.from('fotos').upload(caminho, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
  if (error) throw error;
  return caminho;
}

/** Envia um serviço (fotos primeiro, depois o registro). Lança erro se falhar. */
export async function enviarServico(s: ServicoPendente) {
  const sb = createClient();
  const base = `servicos/${s.cliente_id}/${s.id}`;
  const antes = await Promise.all(s.fotos_antes.map((b, i) => subir(b, `${base}/antes-${i}.jpg`)));
  const depois = await Promise.all(s.fotos_depois.map((b, i) => subir(b, `${base}/depois-${i}.jpg`)));
  const assinatura = s.assinatura ? await subir(s.assinatura, `${base}/assinatura.png`) : null;
  const { error } = await sb.from('servicos').upsert(
    {
      id: s.id,
      tipo: s.tipo,
      cliente_id: s.cliente_id,
      chopeira_id: s.chopeira_id,
      agendamento_id: s.agendamento_id,
      tecnico_id: s.tecnico_id,
      realizado_em: s.realizado_em,
      checklist: s.checklist,
      observacoes: s.observacoes || null,
      aceite_nome: s.aceite_nome || null,
      fotos_antes: antes,
      fotos_depois: depois,
      assinatura_url: assinatura,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (error) throw error;
}

let sincronizando = false;
/** Tenta enviar tudo o que está na fila. Retorna quantos foram enviados. */
export async function sincronizar(): Promise<number> {
  if (sincronizando || !navigator.onLine) return 0;
  sincronizando = true;
  let ok = 0;
  try {
    for (const s of await listarPendentes()) {
      try {
        await enviarServico(s);
        await remover(s.id);
        ok++;
      } catch (e) {
        await tx('readwrite', (st) => st.put({ ...s, erro: (e as Error).message }));
      }
    }
  } finally {
    sincronizando = false;
    avisar();
  }
  return ok;
}

/** Reduz a foto para no máx. 1280px em JPEG (~150–300 KB) – essencial no 4G fraco. */
export async function comprimirImagem(file: File, max = 1280, qualidade = 0.72): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const esc = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * esc);
  c.height = Math.round(bmp.height * esc);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b ?? file), 'image/jpeg', qualidade));
}
