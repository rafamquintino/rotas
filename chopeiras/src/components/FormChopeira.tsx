import { BotaoEnviar } from './Botoes';
import { salvarChopeira } from '@/app/(app)/chopeiras/actions';
import type { Chopeira, Modelo } from '@/lib/types';

export function FormChopeira({ c, modelos }: { c?: Chopeira; modelos: Modelo[] }) {
  return (
    <form action={salvarChopeira} className="cartao flex flex-col gap-4">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo">Código</label>
          <input name="codigo" defaultValue={c?.codigo} placeholder="Automático" className="campo uppercase" />
        </div>
        <div>
          <label className="rotulo">Nº de série</label>
          <input name="numero_serie" defaultValue={c?.numero_serie ?? ''} className="campo" />
        </div>
      </div>
      <div>
        <label className="rotulo">Modelo (define a capacidade padrão)</label>
        <select name="modelo_id" defaultValue={c?.modelo_id ?? ''} className="campo">
          <option value="">— sem modelo —</option>
          {modelos.map((m) => <option key={m.id} value={m.id}>{m.nome} · {Number(m.capacidade_lph)} L/h</option>)}
        </select>
      </div>
      <fieldset>
        <legend className="rotulo">Marca</legend>
        <div className="grid grid-cols-2 gap-2">
          {['Gorillaz', 'Gonçalves'].map((m) => (
            <label key={m} className="chip justify-center has-[:checked]:border-marca has-[:checked]:bg-marca/15 has-[:checked]:text-marca-forte cursor-pointer">
              <input type="radio" name="marca" value={m} required defaultChecked={c ? c.marca === m : m === 'Gorillaz'} className="sr-only" />{m}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="rotulo">Voltagem</legend>
        <div className="grid grid-cols-2 gap-2">
          {['110V', '220V'].map((v) => (
            <label key={v} className="chip justify-center has-[:checked]:border-marca has-[:checked]:bg-marca/15 has-[:checked]:text-marca-forte cursor-pointer">
              <input type="radio" name="voltagem" value={v} required defaultChecked={c ? c.voltagem === v : v === '220V'} className="sr-only" />{v}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="rotulo">Vias</legend>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((v) => (
            <label key={v} className="chip justify-center has-[:checked]:border-marca has-[:checked]:bg-marca/15 has-[:checked]:text-marca-forte cursor-pointer">
              <input type="radio" name="vias" value={v} required defaultChecked={c ? c.vias === v : v === 1} className="sr-only" />{v}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="rotulo">Capacidade (L/h) – vazio usa a do modelo</label>
        <input name="capacidade_lph" type="number" step="0.1" min="1" inputMode="decimal" defaultValue={c?.capacidade_lph ?? ''} className="campo" />
      </div>
      <div>
        <label className="rotulo">Observações</label>
        <textarea name="observacoes" rows={2} defaultValue={c?.observacoes ?? ''} className="campo" />
      </div>
      <BotaoEnviar>{c ? 'Salvar alterações' : 'Cadastrar chopeira'}</BotaoEnviar>
    </form>
  );
}
