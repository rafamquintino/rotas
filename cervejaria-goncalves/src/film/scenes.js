// Cenas do "filme" que avança com o scroll.
// mode 'loop': vídeo em loop enquanto a cena está na tela.
// mode 'scrub': o scroll controla o tempo do vídeo (precisa ser codificado só com keyframes, o script já faz isso).
// fallback: se o arquivo não existir, usa outra cena (com filtro de cor opcional).
export const SCENES = [
  { key: 'hero', mode: 'loop', label: 'Copo de chope em fundo escuro, bolhas subindo' },
  { key: 'mergulho', mode: 'scrub', label: 'Chope sendo tirado em câmera lenta, bem de perto' },
  { key: 'lager', mode: 'loop', label: 'Bolhas em macro num líquido dourado e límpido' },
  { key: 'ipa', mode: 'loop', label: 'Bolhas em macro num líquido cobre', fallback: 'lager' },
  { key: 'weiss', mode: 'loop', label: 'Cerveja de trigo turva, bolhas e névoa', fallback: 'lager' },
  { key: 'malte', mode: 'loop', label: 'Grãos de malte caindo ou sendo revolvidos' },
  { key: 'lupulo', mode: 'loop', label: 'Cones de lúpulo verde de perto' },
  { key: 'fermentacao', mode: 'loop', label: 'Tanque de fermentação ou espuma de fermentação' },
  { key: 'espuma', mode: 'scrub', label: 'Espuma subindo e transbordando, macro' },
  { key: 'bar', mode: 'loop', label: 'Seu chope e suas garrafas 600 ml numa mesa de bar' },
]

// Filtros usados quando um estilo reaproveita o vídeo de outro
export const TINTS = {
  ipa: 'sepia(0.35) saturate(1.7) hue-rotate(-14deg) brightness(0.82) contrast(1.08)',
  weiss: 'saturate(0.75) brightness(1.18) contrast(0.86) blur(0.6px)',
}
