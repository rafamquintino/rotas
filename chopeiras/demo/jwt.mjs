// JWT HS256 mínimo para o modo demonstração.
import crypto from 'node:crypto';

const SEGREDO = process.env.JWT_SEGREDO ?? 'segredo-demo-chopeiras';
const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');

export function assinar(payload) {
  const corpo = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}`;
  return `${corpo}.${crypto.createHmac('sha256', SEGREDO).update(corpo).digest('base64url')}`;
}

export function verificar(token) {
  if (!token) return null;
  const [h, p, s] = token.split('.');
  if (!s || crypto.createHmac('sha256', SEGREDO).update(`${h}.${p}`).digest('base64url') !== s) return null;
  const dados = JSON.parse(Buffer.from(p, 'base64url').toString());
  return dados.exp && dados.exp < Date.now() / 1000 ? null : dados;
}

// node demo/jwt.mjs anon|servico → imprime a chave
if (process.argv[1]?.endsWith('jwt.mjs')) {
  console.log(assinar({ role: process.argv[2] === 'servico' ? 'service_role' : 'anon', iss: 'demo' }));
}
