'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { exigirPerfil } from '@/lib/auth';
import { erroMsg, voltar } from '@/lib/flash';
import type { Perfil } from '@/lib/types';

const cidadesDe = (v: unknown) => String(v ?? '').split(/[,;]/).map((c) => c.trim()).filter(Boolean);

// ----------------------------- Modelos -----------------------------
export async function salvarModelo(form: FormData) {
  await exigirPerfil('gestor');
  const id = String(form.get('id') ?? '');
  const dados = {
    nome: String(form.get('nome') ?? '').trim(),
    marca: String(form.get('marca')),
    vias: Number(form.get('vias')),
    capacidade_lph: Number(form.get('capacidade_lph')),
  };
  const sb = await createClient();
  const { error } = id ? await sb.from('modelos').update(dados).eq('id', id) : await sb.from('modelos').insert(dados);
  if (error) voltar('/cadastros/modelos', { erro: erroMsg(error) });
  revalidatePath('/', 'layout');
  voltar('/cadastros/modelos', { ok: id ? 'Modelo atualizado (capacidade aplicada às chopeiras do modelo)' : 'Modelo cadastrado' });
}

// ----------------------------- Usuários -----------------------------
async function criarUsuarioAuth(criadoPor: string, d: { nome: string; email: string; senha: string; perfil: Perfil; telefone?: string; cidades: string[] }) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: d.email,
    password: d.senha,
    email_confirm: true,
    user_metadata: { nome: d.nome, perfil: d.perfil, telefone: d.telefone ?? '', cidades: d.cidades.join(','), criado_por: criadoPor },
  });
  return error;
}

export async function criarUsuario(form: FormData) {
  const g = await exigirPerfil('gestor');
  const senha = String(form.get('senha') ?? '');
  if (senha.length < 8) voltar('/cadastros/usuarios', { erro: 'A senha deve ter ao menos 8 caracteres' });
  const error = await criarUsuarioAuth(g.id, {
    nome: String(form.get('nome') ?? '').trim(),
    email: String(form.get('email') ?? '').trim().toLowerCase(),
    senha,
    perfil: String(form.get('perfil')) as Perfil,
    telefone: String(form.get('telefone') ?? '').trim(),
    cidades: cidadesDe(form.get('cidades')),
  }).catch((e: Error) => e);
  if (error) voltar('/cadastros/usuarios', { erro: erroMsg(error) });
  revalidatePath('/cadastros/usuarios');
  voltar('/cadastros/usuarios', { ok: 'Usuário criado. Passe o e-mail e a senha para a pessoa.' });
}

export async function atualizarUsuario(form: FormData) {
  await exigirPerfil('gestor');
  const sb = await createClient();
  const { error } = await sb.from('usuarios').update({
    nome: String(form.get('nome') ?? '').trim(),
    perfil: String(form.get('perfil')),
    telefone: String(form.get('telefone') ?? '').trim() || null,
    cidades: cidadesDe(form.get('cidades')),
    ativo: form.get('ativo') === 'on',
  }).eq('id', String(form.get('id')));
  if (error) voltar('/cadastros/usuarios', { erro: erroMsg(error) });
  revalidatePath('/', 'layout');
  voltar('/cadastros/usuarios', { ok: 'Usuário atualizado' });
}

// ----------------------------- Importação CSV -----------------------------
type Linha = Record<string, string>;
export type ResultadoImport = { ok: number; erros: string[] };

const pega = (l: Linha, ...nomes: string[]) => {
  for (const n of nomes) {
    const k = Object.keys(l).find((k) => k.trim().toLowerCase() === n);
    if (k && l[k]?.trim()) return l[k].trim();
  }
  return '';
};
const normMarca = (m: string) => (/gor/i.test(m) ? 'Gorillaz' : /gon/i.test(m) ? 'Gonçalves' : '');
const normCondicao = (c: string) => {
  const t = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return ['otima', 'boa', 'regular', 'ruim'].includes(t) ? t : null;
};
const normVolt = (v: string) => (/110|127/.test(v) ? '110V' : /220/.test(v) ? '220V' : '');

export async function importarCsv(tipo: 'chopeiras' | 'clientes' | 'usuarios', linhas: Linha[]): Promise<ResultadoImport> {
  const g = await exigirPerfil('gestor');
  const sb = await createClient();
  const erros: string[] = [];
  let ok = 0;

  if (tipo === 'chopeiras') {
    const { data: modelos } = await sb.from('modelos').select('id, nome');
    const registros = linhas.map((l, i) => {
      const marca = normMarca(pega(l, 'marca'));
      const voltagem = normVolt(pega(l, 'voltagem', 'tensao', 'tensão'));
      const vias = Number(pega(l, 'vias'));
      if (!marca || !voltagem || ![1, 2, 3].includes(vias)) {
        erros.push(`Linha ${i + 2}: marca, voltagem ou vias inválidas`);
        return null;
      }
      const modelo = pega(l, 'modelo');
      const cap = pega(l, 'capacidade_lph', 'capacidade', 'litros_hora').replace(',', '.');
      return {
        patrimonio: pega(l, 'patrimonio', 'patrimônio') ? pega(l, 'patrimonio', 'patrimônio').padStart(4, '0') : null,
        condicao: normCondicao(pega(l, 'condicao', 'condição')),
        numero_serie: pega(l, 'numero_serie', 'serie', 'série', 'nº série') || null,
        marca, voltagem, vias,
        modelo_id: modelos?.find((m) => m.nome.toLowerCase() === modelo.toLowerCase())?.id ?? null,
        capacidade_lph: cap ? Number(cap) : null,
        observacoes: pega(l, 'observacoes', 'observações', 'obs') || null,
      };
    });
    for (const r of registros) {
      if (!r) continue;
      const { error } = await sb.from('chopeiras').insert(r);
      if (error) erros.push(`${r.patrimonio ?? r.numero_serie ?? 'chopeira'}: ${erroMsg(error)}`); else ok++;
    }
  }

  if (tipo === 'clientes') {
    const { data: vend } = await sb.from('usuarios').select('id, email, nome').eq('perfil', 'vendedor');
    for (const [i, l] of linhas.entries()) {
      const nome = pega(l, 'nome', 'estabelecimento', 'cliente');
      const cidade = pega(l, 'cidade');
      if (!nome || !cidade) { erros.push(`Linha ${i + 2}: nome e cidade são obrigatórios`); continue; }
      const v = pega(l, 'vendedor', 'vendedor_email', 'email_vendedor').toLowerCase();
      const vendedor = v ? vend?.find((x) => x.email?.toLowerCase() === v || x.nome.toLowerCase() === v) : null;
      if (v && !vendedor) erros.push(`Linha ${i + 2}: vendedor "${v}" não encontrado (importado sem vendedor)`);
      const { error } = await sb.from('clientes').insert({
        nome, cidade,
        endereco: pega(l, 'endereco', 'endereço') || null,
        contato: pega(l, 'contato') || null,
        telefone: pega(l, 'telefone', 'fone', 'whatsapp') || null,
        tipo: pega(l, 'tipo').toLowerCase() || 'bar',
        vendedor_id: vendedor?.id ?? null,
        freq_assepsia_dias: Number(pega(l, 'freq_assepsia_dias', 'frequencia_assepsia', 'assepsia_dias')) || 15,
        freq_manutencao_dias: Number(pega(l, 'freq_manutencao_dias', 'frequencia_manutencao', 'manutencao_dias')) || 90,
      });
      if (error) erros.push(`${nome}: ${erroMsg(error)}`); else ok++;
    }
  }

  if (tipo === 'usuarios') {
    for (const [i, l] of linhas.entries()) {
      const email = pega(l, 'email', 'e-mail').toLowerCase();
      const senha = pega(l, 'senha');
      const perfil = pega(l, 'perfil').toLowerCase() as Perfil;
      if (!email || senha.length < 8 || !['gestor', 'vendedor', 'tecnico'].includes(perfil)) {
        erros.push(`Linha ${i + 2}: e-mail, senha (8+ caracteres) e perfil (gestor/vendedor/tecnico) são obrigatórios`);
        continue;
      }
      const error = await criarUsuarioAuth(g.id, {
        nome: pega(l, 'nome') || email.split('@')[0], email, senha, perfil,
        telefone: pega(l, 'telefone'), cidades: cidadesDe(pega(l, 'cidades')),
      }).catch((e: Error) => e);
      if (error) erros.push(`${email}: ${erroMsg(error)}`); else ok++;
    }
  }

  revalidatePath('/', 'layout');
  return { ok, erros };
}
