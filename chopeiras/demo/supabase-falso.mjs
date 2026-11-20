// Servidor de DEMONSTRAÇÃO que imita o Supabase (Auth, REST e Storage) sobre um Postgres local.
// Serve para ver o app funcionando sem criar conta no Supabase. NÃO use em produção.
//
// Porta pública (PORTA, padrão 3000): /auth/v1, /rest/v1 e /storage/v1 são tratados aqui;
// todo o resto é repassado ao Next.js (NEXT_PORTA, padrão 3001).
// As consultas rodam com o role "authenticated" e o id do usuário logado, então o RLS vale de verdade.
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const PORTA = Number(process.env.PORTA ?? 3000);
const NEXT_PORTA = Number(process.env.NEXT_PORTA ?? 3001);
const PASTA_FOTOS = process.env.PASTA_FOTOS ?? path.resolve('demo/.fotos');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const refreshTokens = new Map();

import { assinar, verificar } from './jwt.mjs';

function quemChama(req) {
  const t = (req.headers.authorization ?? '').replace(/^Bearer /i, '');
  return verificar(t);
}

// ------------------------------------------------------------------ utilidades
const ler = (req) => new Promise((ok) => { const p = []; req.on('data', (c) => p.push(c)); req.on('end', () => ok(Buffer.concat(p))); });
function json(res, status, corpo, extra = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...extra });
  res.end(corpo === undefined ? '' : JSON.stringify(corpo));
}
const id = (s) => '"' + String(s).replace(/"/g, '""') + '"';

/** Executa como o usuário (RLS) ou como serviço (ignora RLS). */
async function comoUsuario(claims, fn) {
  const c = await pool.connect();
  try {
    await c.query('begin');
    if (claims?.role !== 'service_role') {
      await c.query('set local role authenticated');
      await c.query("select set_config('request.jwt.claim.sub', $1, true)", [claims?.sub ?? '']);
    }
    const r = await fn(c);
    await c.query('commit');
    return r;
  } catch (e) {
    await c.query('rollback').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

// ------------------------------------------------------------------ Auth (/auth/v1)
async function usuarioPorId(uid) {
  const { rows } = await pool.query('select id, email, raw_user_meta_data from auth.users where id = $1', [uid]);
  return rows[0];
}
const formatoUsuario = (u) => ({
  id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email,
  user_metadata: u.raw_user_meta_data ?? {}, app_metadata: { provider: 'email' },
  created_at: new Date().toISOString(), email_confirmed_at: new Date().toISOString(),
});
function sessao(u) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const refresh = crypto.randomBytes(16).toString('hex');
  refreshTokens.set(refresh, u.id);
  return {
    access_token: assinar({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', exp, iat: exp - 3600, session_id: refresh }),
    token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: refresh, user: formatoUsuario(u),
  };
}
const erroAuth = (res, status, msg) => json(res, status, { code: status, error: 'invalid_grant', error_description: msg, msg, message: msg });

async function auth(req, res, rota, url) {
  const corpo = ['POST', 'PUT'].includes(req.method) ? JSON.parse((await ler(req)).toString() || '{}') : {};
  if (rota === '/token') {
    if (url.searchParams.get('grant_type') === 'password') {
      const { rows } = await pool.query('select id, email, raw_user_meta_data, senha from auth.users where lower(email) = lower($1)', [corpo.email]);
      if (!rows[0] || rows[0].senha !== corpo.password) return erroAuth(res, 400, 'Invalid login credentials');
      return json(res, 200, sessao(rows[0]));
    }
    const uid = refreshTokens.get(corpo.refresh_token);
    if (!uid) return erroAuth(res, 400, 'Invalid Refresh Token');
    return json(res, 200, sessao(await usuarioPorId(uid)));
  }
  if (rota === '/user') {
    const c = quemChama(req);
    if (!c?.sub) return erroAuth(res, 401, 'invalid JWT');
    if (req.method === 'PUT' && corpo.password) await pool.query('update auth.users set senha = $2 where id = $1', [c.sub, corpo.password]);
    const u = await usuarioPorId(c.sub);
    return u ? json(res, 200, formatoUsuario(u)) : erroAuth(res, 401, 'user not found');
  }
  if (rota === '/logout') return json(res, 204);
  if (rota === '/recover') return json(res, 200, {});
  if (rota === '/admin/users' && req.method === 'POST') {
    if (quemChama(req)?.role !== 'service_role') return erroAuth(res, 403, 'not admin');
    try {
      const { rows } = await pool.query(
        'insert into auth.users (email, raw_user_meta_data, senha) values ($1, $2, $3) returning id, email, raw_user_meta_data',
        [corpo.email, corpo.user_metadata ?? {}, corpo.password],
      );
      return json(res, 200, formatoUsuario(rows[0]));
    } catch (e) {
      return erroAuth(res, 422, e.code === '23505' ? 'A user with this email address has already been registered' : e.message);
    }
  }
  return json(res, 404, { message: 'rota de auth não simulada: ' + rota });
}

// ------------------------------------------------------------------ REST (/rest/v1) – subconjunto do PostgREST
function dividir(s) { // separa por vírgula no nível de cima (respeita parênteses)
  const out = []; let nivel = 0, atual = '';
  for (const ch of s) {
    if (ch === '(') nivel++;
    if (ch === ')') nivel--;
    if (ch === ',' && nivel === 0) { out.push(atual); atual = ''; } else atual += ch;
  }
  if (atual) out.push(atual);
  return out;
}

function condicao(tabela, coluna, expr, params) {
  let neg = false;
  if (expr.startsWith('not.')) { neg = true; expr = expr.slice(4); }
  const i = expr.indexOf('.');
  const op = expr.slice(0, i), val = expr.slice(i + 1);
  const col = `${id(tabela)}.${id(coluna)}`;
  const p = (v) => { params.push(v); return `$${params.length}`; };
  const ops = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', like: 'like', ilike: 'ilike' };
  let sql;
  if (ops[op]) sql = `${col} ${ops[op]} ${p(op.includes('like') ? val.replace(/\*/g, '%') : val)}`;
  else if (op === 'is') sql = `${col} is ${val === 'null' ? 'null' : val === 'true' ? 'true' : 'false'}`;
  else if (op === 'in') sql = `${col}::text = any(${p(dividir(val.replace(/^\(|\)$/g, '')).map((v) => v.replace(/^"|"$/g, '')))}::text[])`;
  else throw Object.assign(new Error('operador não simulado: ' + op), { status: 400 });
  return neg ? `not (${sql})` : sql;
}

function logica(tabela, tipo, conteudo, params) { // or=(a.eq.1,and(b.gt.2,c.lt.3))
  const partes = dividir(conteudo).map((t) => {
    const m = t.match(/^(and|or)\((.*)\)$/);
    if (m) return logica(tabela, m[1], m[2], params);
    const i = t.indexOf('.');
    return condicao(tabela, t.slice(0, i), t.slice(i + 1), params);
  });
  return `(${partes.join(tipo === 'or' ? ' or ' : ' and ')})`;
}

const RESERVADOS = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);
function filtros(tabela, url, params) {
  const conds = [];
  for (const [k, v] of url.searchParams) {
    if (RESERVADOS.has(k)) continue;
    if (k === 'or' || k === 'and') conds.push(logica(tabela, k, v.replace(/^\(|\)$/g, ''), params));
    else conds.push(condicao(tabela, k, v, params));
  }
  return conds.length ? ` where ${conds.join(' and ')}` : '';
}

function errorPg(res, e) {
  const status = e.status ?? (e.code === '42501' ? 403 : e.code === '23505' ? 409 : 400);
  json(res, status, { code: e.code ?? 'PGRST', message: e.message, details: e.detail ?? null, hint: e.hint ?? null });
}

async function rest(req, res, rota, url) {
  const claims = quemChama(req);
  if (!claims) return json(res, 401, { message: 'JWT inválido' });
  const prefer = req.headers.prefer ?? '';
  const umObjeto = (req.headers.accept ?? '').includes('vnd.pgrst.object');
  const retorna = prefer.includes('return=representation');
  const corpoTxt = ['POST', 'PATCH'].includes(req.method) ? (await ler(req)).toString() : '';
  const params = [];
  try {
    let sql;
    const responder = (rows, statusVazio = 200) => {
      if (umObjeto) {
        if (rows.length !== 1) return json(res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `${rows.length} rows` });
        return json(res, 200, rows[0]);
      }
      if (req.method !== 'GET' && !retorna && !rota.startsWith('/rpc/')) return json(res, statusVazio);
      return json(res, 200, rows);
    };

    if (rota.startsWith('/rpc/')) {
      const fn = rota.slice(5);
      const args = JSON.parse(corpoTxt || '{}');
      const nomes = Object.keys(args);
      sql = `select * from ${id(fn)}(${nomes.map((n, i) => `${id(n)} => $${i + 1}`).join(', ')})`;
      const rows = await comoUsuario(claims, (c) => c.query(sql, nomes.map((n) => args[n])).then((r) => r.rows));
      return json(res, 200, rows.length === 1 ? rows[0] : rows);
    }

    const tabela = rota.slice(1);
    if ((req.method === 'GET' || req.method === 'HEAD') && prefer.includes('count=')) {
      const pc = [];
      const n = await comoUsuario(claims, (c) => c.query(`select count(*)::int as n from ${id(tabela)}${filtros(tabela, url, pc)}`, pc).then((r) => r.rows[0].n));
      res.setHeader('Content-Range', `*/${n}`);
      if (req.method === 'HEAD') { res.writeHead(200); return res.end(); }
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      const sel = url.searchParams.get('select') ?? '*';
      const cols = sel === '*' ? '*' : sel.split(',').map((c) => id(c.trim())).join(', ');
      sql = `select ${cols} from ${id(tabela)}${filtros(tabela, url, params)}`;
      const ordem = url.searchParams.get('order');
      if (ordem) {
        sql += ' order by ' + ordem.split(',').map((o) => {
          const [c, dir, nulls] = o.split('.');
          return `${id(c)} ${dir === 'desc' ? 'desc' : 'asc'}${nulls === 'nullsfirst' ? ' nulls first' : nulls === 'nullslast' ? ' nulls last' : ''}`;
        }).join(', ');
      }
      if (url.searchParams.get('limit')) sql += ` limit ${Number(url.searchParams.get('limit'))}`;
      if (url.searchParams.get('offset')) sql += ` offset ${Number(url.searchParams.get('offset'))}`;
      return responder(await comoUsuario(claims, (c) => c.query(sql, params).then((r) => r.rows)));
    }

    if (req.method === 'POST') {
      const corpo = JSON.parse(corpoTxt);
      const linhas = Array.isArray(corpo) ? corpo : [corpo];
      const cols = [...new Set(linhas.flatMap(Object.keys))].map(id);
      params.push(JSON.stringify(linhas));
      sql = `insert into ${id(tabela)} (${cols.join(', ')}) select ${cols.join(', ')} from json_populate_recordset(null::${id(tabela)}, $1)`;
      const conflito = url.searchParams.get('on_conflict');
      if (conflito) {
        sql += prefer.includes('ignore-duplicates')
          ? ` on conflict (${id(conflito)}) do nothing`
          : ` on conflict (${id(conflito)}) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(', ')}`;
      }
      sql += ' returning *';
      return responder(await comoUsuario(claims, (c) => c.query(sql, params).then((r) => r.rows)), 201);
    }

    if (req.method === 'PATCH') {
      const corpo = JSON.parse(corpoTxt);
      params.push(JSON.stringify(corpo));
      const sets = Object.keys(corpo).map((k) => `${id(k)} = _r.${id(k)}`).join(', ');
      sql = `update ${id(tabela)} set ${sets} from json_populate_record(null::${id(tabela)}, $1) _r${filtros(tabela, url, params)} returning ${id(tabela)}.*`;
      return responder(await comoUsuario(claims, (c) => c.query(sql, params).then((r) => r.rows)), 204);
    }

    if (req.method === 'DELETE') {
      sql = `delete from ${id(tabela)}${filtros(tabela, url, params)} returning *`;
      return responder(await comoUsuario(claims, (c) => c.query(sql, params).then((r) => r.rows)), 204);
    }
    json(res, 405, { message: 'método não suportado' });
  } catch (e) {
    errorPg(res, e);
  }
}

// ------------------------------------------------------------------ Storage (/storage/v1) – só o bucket "fotos"
async function storage(req, res, rota, url) {
  const assinado = rota.match(/^\/object\/sign\/([^/]+)\/(.+)$/);
  if (req.method === 'GET' && assinado) {
    const dados = verificar(url.searchParams.get('token'));
    const arq = path.join(PASTA_FOTOS, decodeURIComponent(assinado[2]));
    if (!dados || dados.caminho !== decodeURIComponent(assinado[2]) || !arq.startsWith(PASTA_FOTOS) || !fs.existsSync(arq)) {
      return json(res, 404, { message: 'não encontrado' });
    }
    res.writeHead(200, { 'Content-Type': arq.endsWith('.png') ? 'image/png' : 'image/jpeg', 'Cache-Control': 'private, max-age=3600' });
    return fs.createReadStream(arq).pipe(res);
  }
  const claims = quemChama(req);
  if (!claims?.sub && claims?.role !== 'service_role') return json(res, 401, { message: 'não autenticado' });

  if (req.method === 'POST' && rota.startsWith('/object/sign/')) {
    const { paths, expiresIn } = JSON.parse((await ler(req)).toString());
    const exp = Math.floor(Date.now() / 1000) + (expiresIn ?? 3600);
    return json(res, 200, paths.map((p) => ({
      path: p, error: null,
      signedURL: `/object/sign/fotos/${p}?token=${assinar({ caminho: p, exp })}`,
    })));
  }
  const up = rota.match(/^\/object\/fotos\/(.+)$/);
  if (up && (req.method === 'POST' || req.method === 'PUT')) {
    // Mesma regra do bucket real: só gestor e técnico enviam fotos
    const pode = await comoUsuario(claims, (c) => c.query('select public.eh_gestor_ou_tecnico() as ok').then((r) => r.rows[0].ok));
    if (!pode && claims.role !== 'service_role') return json(res, 403, { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' });
    const corpo = await ler(req);
    const tipo = req.headers['content-type'] ?? '';
    let bytes = corpo;
    if (tipo.startsWith('multipart/form-data')) {
      const fd = await new Response(corpo, { headers: { 'content-type': tipo } }).formData();
      const arquivo = [...fd.values()].find((v) => typeof v !== 'string');
      bytes = Buffer.from(await arquivo.arrayBuffer());
    }
    const caminho = decodeURIComponent(up[1]);
    const destino = path.join(PASTA_FOTOS, caminho);
    if (!destino.startsWith(PASTA_FOTOS)) return json(res, 400, { message: 'caminho inválido' });
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, bytes);
    return json(res, 200, { Key: `fotos/${caminho}`, Id: crypto.randomUUID(), path: caminho });
  }
  json(res, 404, { message: 'rota de storage não simulada' });
}

// ------------------------------------------------------------------ roteamento + proxy para o Next
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, prefer, accept, x-client-info, x-upsert, accept-profile, content-profile, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  const m = url.pathname.match(/^\/(auth|rest|storage)\/v1(\/.*)?$/);
  if (m) {
    Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
    if (req.method === 'OPTIONS') return json(res, 204);
    try {
      const rota = m[2] ?? '/';
      if (m[1] === 'auth') return await auth(req, res, rota, url);
      if (m[1] === 'rest') return await rest(req, res, rota, url);
      return await storage(req, res, rota, url);
    } catch (e) {
      console.error(e);
      return json(res, 500, { message: e.message });
    }
  }
  const prox = http.request({ host: '127.0.0.1', port: NEXT_PORTA, path: req.url, method: req.method, headers: req.headers }, (r) => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res);
  });
  prox.on('error', () => { res.writeHead(502); res.end('Next.js ainda iniciando… recarregue em instantes.'); });
  req.pipe(prox);
}).listen(PORTA, () => console.log(`Demo em http://localhost:${PORTA} (Next em ${NEXT_PORTA})`));

