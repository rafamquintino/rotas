/** Aparece na hora do toque enquanto a próxima tela carrega (sensação de app rápido no 4G). */
export default function Carregando() {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-busy="true" aria-label="Carregando">
      <div className="h-7 w-1/2 rounded-lg bg-borda/70" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-borda/50" />)}
      </div>
      {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-2xl bg-borda/40" />)}
    </div>
  );
}
