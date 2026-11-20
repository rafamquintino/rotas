'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Leitura da etiqueta de patrimônio (código de barras Code 128 com 4 números) pela câmera.
 * - Android/Chrome: usa o leitor nativo do navegador (BarcodeDetector).
 * - iPhone e demais: carrega a biblioteca ZXing só quando a câmera é aberta.
 * Sempre oferece digitar o número (etiqueta gasta, sem câmera, sem permissão).
 */
type Props = {
  onLer: (patrimonio: string) => void;
  rotulo?: string;
  className?: string;
};

export const PATRIMONIO_RE = /^\d{4}$/;

export function BotaoLerPatrimonio({ onLer, rotulo = '📷 Ler patrimônio', className = 'btn-secundario' }: Props) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setAberto(true)}>{rotulo}</button>
      {aberto && (
        <LeitorPatrimonio
          onFechar={() => setAberto(false)}
          onLer={(p) => { setAberto(false); onLer(p); }}
        />
      )}
    </>
  );
}

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

function LeitorPatrimonio({ onLer, onFechar }: { onLer: (p: string) => void; onFechar: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [lanterna, setLanterna] = useState<null | boolean>(null); // null = aparelho sem lanterna
  const [digitado, setDigitado] = useState('');
  const trilha = useRef<MediaStreamTrack | null>(null);
  const aoLer = useRef(onLer);
  aoLer.current = onLer;

  useEffect(() => {
    let ativo = true;
    let parar: (() => void) | undefined;
    let stream: MediaStream | undefined;

    const aceitar = (valor: string) => {
      const v = valor.trim();
      if (PATRIMONIO_RE.test(v)) {
        if (!ativo) return;
        ativo = false;
        try { navigator.vibrate?.(80); } catch {}
        aoLer.current(v);
      } else {
        setAviso(`Código lido: "${v}". Não é um patrimônio de 4 números.`);
      }
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!ativo) return stream.getTracks().forEach((t) => t.stop());
        const t = stream.getVideoTracks()[0];
        trilha.current = t;
        const cap = (t.getCapabilities?.() ?? {}) as { torch?: boolean };
        if (cap.torch) setLanterna(false);
        const v = video.current!;
        v.srcObject = stream;
        await v.play().catch(() => {});

        const BD = (window as unknown as { BarcodeDetector?: { new (o: object): Detector; getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector;
        const formatos = BD?.getSupportedFormats ? await BD.getSupportedFormats().catch(() => []) : [];
        if (BD && formatos.includes('code_128')) {
          const det = new BD({ formats: ['code_128'] });
          let rodando = true;
          parar = () => { rodando = false; };
          const loop = async () => {
            if (!rodando || !ativo) return;
            try {
              if (v.readyState >= 2) {
                const r = await det.detect(v);
                if (r[0]?.rawValue) aceitar(r[0].rawValue);
              }
            } catch {}
            setTimeout(loop, 150);
          };
          loop();
        } else {
          const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
            import('@zxing/browser'),
            import('@zxing/library'),
          ]);
          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]);
          hints.set(DecodeHintType.TRY_HARDER, true);
          const leitor = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
          const controles = await leitor.decodeFromStream(stream, v, (res) => {
            if (res) aceitar(res.getText());
          });
          parar = () => controles.stop();
        }
      } catch (e) {
        const nome = (e as Error).name;
        setErro(
          nome === 'NotAllowedError'
            ? 'A câmera foi bloqueada. Libere o acesso à câmera nas configurações do navegador ou digite o número abaixo.'
            : 'Não foi possível abrir a câmera. Digite o número do patrimônio abaixo.',
        );
      }
    })();

    return () => {
      ativo = false;
      parar?.();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const confirmarDigitado = () => {
    if (PATRIMONIO_RE.test(digitado)) aoLer.current(digitado);
    else setAviso('Digite os 4 números do patrimônio.');
  };

  const alternarLanterna = async () => {
    const t = trilha.current;
    if (!t || lanterna === null) return;
    try {
      await t.applyConstraints({ advanced: [{ torch: !lanterna } as MediaTrackConstraintSet] });
      setLanterna(!lanterna);
    } catch {
      setLanterna(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-label="Ler patrimônio">
      <div className="relative flex-1 overflow-hidden">
        <video ref={video} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
        {/* Moldura para enquadrar a etiqueta */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-32 w-[80%] max-w-sm rounded-2xl border-4 border-cevada shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
        </div>
        <p className="absolute inset-x-0 top-0 p-4 text-center text-sm font-semibold" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          Aponte para o código de barras da etiqueta de patrimônio
        </p>
        {(erro || aviso) && (
          <p className="absolute inset-x-4 bottom-4 rounded-xl bg-black/75 p-3 text-center text-sm">{erro ?? aviso}</p>
        )}
      </div>
      <div className="flex flex-col gap-3 bg-malte p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        {/* Sem <form>: o leitor costuma ficar dentro de outro formulário (ex.: cadastro) */}
        <div className="flex gap-2">
          <input
            value={digitado}
            onChange={(e) => setDigitado(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmarDigitado(); } }}
            inputMode="numeric"
            placeholder="ou digite: 0878"
            aria-label="Número do patrimônio"
            className="campo flex-1 text-center text-lg tracking-widest text-texto"
          />
          <button type="button" onClick={confirmarDigitado} className="btn-primario px-5">OK</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={alternarLanterna} disabled={lanterna === null} className="btn border border-white/30 text-white disabled:opacity-40">
            {lanterna ? '🔦 Desligar luz' : '🔦 Lanterna'}
          </button>
          <button type="button" onClick={onFechar} className="btn border border-white/30 text-white">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/** Abre a câmera e confere se a etiqueta lida é a da chopeira esperada. */
export function ConferirPatrimonio({ esperado, rotulo }: { esperado: string | null; rotulo: string }) {
  const [lido, setLido] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <BotaoLerPatrimonio onLer={setLido} rotulo="📷 Conferir etiqueta" className="btn-secundario w-full" />
      {lido && (
        esperado === lido ? (
          <p className="rounded-xl bg-ok/15 p-3 text-sm font-semibold text-ok">✓ Confere: patrimônio {lido} é a chopeira {rotulo}.</p>
        ) : (
          <p className="rounded-xl bg-perigo/15 p-3 text-sm font-semibold text-perigo">
            ✗ A etiqueta lida é {lido}, mas esta chopeira é {esperado ? `o patrimônio ${esperado}` : 'sem patrimônio cadastrado'}. Confira se pegou a chopeira certa.
          </p>
        )
      )}
    </div>
  );
}
