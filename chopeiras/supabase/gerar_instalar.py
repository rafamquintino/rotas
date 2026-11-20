"""Gera supabase/instalar.sql (instalação do zero, numa única execução) a partir das migrações.
As migrações que só adicionam valores a enums são incorporadas direto no CREATE TYPE, porque o
Postgres não permite usar um valor novo de enum na mesma transação em que ele foi criado."""
import glob, os, re

raiz = os.path.dirname(os.path.abspath(__file__))
arqs = sorted(glob.glob(os.path.join(raiz, 'migrations', '*.sql')))
enums_extra = {}   # tipo -> [(valor, depois_de)]
tipos_novos = []
partes = []
for a in arqs:
    s = open(a, encoding='utf-8').read()
    adds = re.findall(r"alter type (\w+)\s+add value if not exists '(\w+)'(?: after '(\w+)')?;", s)
    if adds:
        for t, v, depois in adds:
            enums_extra.setdefault(t, []).append((v, depois))
        tipos_novos += re.findall(r"^create type .*?;$", s, flags=re.M)
        continue
    partes.append((os.path.relpath(a, os.path.dirname(raiz)), s))

saida = []
for nome, s in partes:
    for t, vals in enums_extra.items():
        m = re.search(rf"create type {t}\s+as enum \((.*?)\);", s)
        if not m:
            continue
        itens = [x.strip().strip("'") for x in m.group(1).split(',')]
        for v, depois in vals:
            itens.insert(itens.index(depois) + 1 if depois in itens else len(itens), v)
        s = s.replace(m.group(0), f"create type {t} as enum ({', '.join(repr(i) for i in itens)});".replace('"', "'"))
        if tipos_novos and t == list(enums_extra)[-1]:
            s = s.replace(f"create type {t} as enum", "\n".join(tipos_novos) + f"\ncreate type {t} as enum", 1)
            tipos_novos = []
    saida.append(f"\n-- ===== {nome} =====\n{s}")

cab = ("-- INSTALAÇÃO COMPLETA (banco vazio) – cole tudo no SQL Editor do Supabase e clique em Run (uma vez só).\n"
       "-- Gerado por supabase/gerar_instalar.py a partir de supabase/migrations/*.sql. Não edite à mão.\n"
       "-- Já instalou antes? Não use este arquivo: rode só as migrações novas, na ordem.\n")
open(os.path.join(raiz, 'instalar.sql'), 'w', encoding='utf-8').write(cab + ''.join(saida))
print('instalar.sql gerado')
