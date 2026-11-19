'use client';
import { useEffect, useRef, useState } from 'react';

/** Quadro de assinatura com o dedo. Chama onChange com o PNG (ou null ao limpar). */
export function Assinatura({ onChange }: { onChange: (b: Blob | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [vazia, setVazia] = useState(true);

  useEffect(() => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    c.width = r.width * devicePixelRatio;
    c.height = r.height * devicePixelRatio;
    const ctx = c.getContext('2d')!;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2a1a08';
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const inicio = (e: React.PointerEvent) => {
    desenhando.current = true;
    ref.current!.setPointerCapture(e.pointerId);
    const ctx = ref.current!.getContext('2d')!;
    ctx.beginPath();
    ctx.moveTo(...pos(e));
  };
  const mover = (e: React.PointerEvent) => {
    if (!desenhando.current) return;
    const ctx = ref.current!.getContext('2d')!;
    ctx.lineTo(...pos(e));
    ctx.stroke();
    setVazia(false);
  };
  const fim = () => {
    if (!desenhando.current) return;
    desenhando.current = false;
    ref.current!.toBlob((b) => onChange(b), 'image/png');
  };
  const limpar = () => {
    const c = ref.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    setVazia(true);
    onChange(null);
  };

  return (
    <div>
      <canvas
        ref={ref}
        className="h-36 w-full touch-none rounded-xl border border-dashed border-borda bg-white"
        onPointerDown={inicio}
        onPointerMove={mover}
        onPointerUp={fim}
        onPointerLeave={fim}
      />
      <div className="mt-1 flex justify-between text-xs text-suave">
        <span>{vazia ? 'Assine com o dedo (opcional)' : 'Assinatura capturada'}</span>
        {!vazia && <button type="button" onClick={limpar} className="font-semibold text-marca">Limpar</button>}
      </div>
    </div>
  );
}
