/** Gera CSV compatível com Excel em pt-BR (separador ;, BOM UTF-8). */
export function toCsv(rows: Record<string, unknown>[], colunas?: { key: string; label: string }[]) {
  const cols = colunas ?? Object.keys(rows[0] ?? {}).map((k) => ({ key: k, label: k }));
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = Array.isArray(v) ? v.join(', ') : String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const linhas = [cols.map((c) => esc(c.label)).join(';'), ...rows.map((r) => cols.map((c) => esc(r[c.key])).join(';'))];
  return '﻿' + linhas.join('\r\n');
}

export function csvResponse(nome: string, csv: string) {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nome}"`,
    },
  });
}
