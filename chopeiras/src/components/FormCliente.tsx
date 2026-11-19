import { BotaoEnviar } from './Botoes';
import { salvarCliente } from '@/app/(app)/clientes/actions';
import { TIPOS_CLIENTE } from '@/lib/format';
import type { Cliente, Usuario } from '@/lib/types';

export function FormCliente({ c, vendedores, gestor }: { c?: Cliente; vendedores: Usuario[]; gestor: boolean }) {
  return (
    <form action={salvarCliente} className="cartao flex flex-col gap-4">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div>
        <label className="rotulo">Nome do estabelecimento *</label>
        <input name="nome" required defaultValue={c?.nome} className="campo" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo">Cidade *</label>
          <input name="cidade" required defaultValue={c?.cidade} className="campo" list="cidades" />
        </div>
        <div>
          <label className="rotulo">Tipo</label>
          <select name="tipo" defaultValue={c?.tipo ?? 'bar'} className="campo">
            {TIPOS_CLIENTE.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="rotulo">Endereço</label>
        <input name="endereco" defaultValue={c?.endereco ?? ''} className="campo" autoComplete="street-address" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo">Contato</label>
          <input name="contato" defaultValue={c?.contato ?? ''} className="campo" />
        </div>
        <div>
          <label className="rotulo">Telefone</label>
          <input name="telefone" type="tel" inputMode="tel" defaultValue={c?.telefone ?? ''} className="campo" />
        </div>
      </div>
      {gestor && (
        <div>
          <label className="rotulo">Vendedor responsável</label>
          <select name="vendedor_id" defaultValue={c?.vendedor_id ?? ''} className="campo">
            <option value="">— sem vendedor —</option>
            {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo">Assepsia a cada (dias)</label>
          <input name="freq_assepsia_dias" type="number" min={1} inputMode="numeric" defaultValue={c?.freq_assepsia_dias ?? 15} className="campo" />
        </div>
        <div>
          <label className="rotulo">Preventiva a cada (dias)</label>
          <input name="freq_manutencao_dias" type="number" min={1} inputMode="numeric" defaultValue={c?.freq_manutencao_dias ?? 90} className="campo" />
        </div>
      </div>
      <div>
        <label className="rotulo">Observações</label>
        <textarea name="observacoes" rows={2} defaultValue={c?.observacoes ?? ''} className="campo" />
      </div>
      <BotaoEnviar>{c ? 'Salvar alterações' : 'Cadastrar cliente'}</BotaoEnviar>
    </form>
  );
}
